import logging
import re
from datetime import UTC, datetime

from sqlalchemy import select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from domain.pipeline.models import BriefDraft, ClusteringResult, RawPost, RawProduct, TaggingResult
from domain.post.models import ACTIONABLE_POST_TYPES, Post
from outbound.postgres.database import Database
from outbound.postgres.mapper import post_to_domain
from outbound.postgres.models import (
    BriefRow,
    BriefSourceRow,
    ClusterPostRow,
    ClusterRow,
    PostRow,
    PostTagRow,
    ProductRow,
    ProductTagRow,
    TagRow,
)

logger = logging.getLogger(__name__)


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


class PostgresPipelineRepository:
    def __init__(self, db: Database) -> None:
        self._db = db
        self._lock_session: AsyncSession | None = None

    async def acquire_advisory_lock(self) -> bool:
        self._lock_session = self._db.session()
        await self._lock_session.__aenter__()
        result = await self._lock_session.execute(
            text("SELECT pg_try_advisory_lock(1)")
        )
        locked = result.scalar()
        if not locked:
            await self._lock_session.__aexit__(None, None, None)
            self._lock_session = None
        return bool(locked)

    async def release_advisory_lock(self) -> None:
        if not self._lock_session:
            return
        try:
            await self._lock_session.execute(
                text("SELECT pg_advisory_unlock(1)")
            )
        except Exception:
            logger.exception("Failed to release advisory lock")
        finally:
            try:
                await self._lock_session.__aexit__(None, None, None)
            except Exception:
                logger.exception("Failed to close lock session")
            self._lock_session = None

    async def upsert_posts(self, posts: list[RawPost]) -> int:
        if not posts:
            return 0

        async with self._db.session() as session:
            now = datetime.now(UTC).replace(tzinfo=None)
            rows = [
                {
                    "created_at": now,
                    "updated_at": now,
                    "external_created_at": p.external_created_at.replace(tzinfo=None)
                    if p.external_created_at.tzinfo
                    else p.external_created_at,
                    "source": p.source,
                    "external_id": p.external_id,
                    "subreddit": p.subreddit,
                    "title": p.title,
                    "body": p.body,
                    "external_url": p.external_url,
                    "score": p.score,
                    "num_comments": p.num_comments,
                }
                for p in posts
            ]

            stmt = pg_insert(PostRow).values(rows)
            stmt = stmt.on_conflict_do_update(
                constraint="uq_post_source_external_id",
                set_={
                    "score": stmt.excluded.score,
                    "num_comments": stmt.excluded.num_comments,
                    "updated_at": now,
                },
            )
            result = await session.execute(stmt)
            await session.commit()
            return result.rowcount

    async def get_pending_posts(self, limit: int = 1000) -> list[Post]:
        stmt = (
            select(PostRow)
            .where(PostRow.tagging_status == "pending", PostRow.deleted_at.is_(None))
            .order_by(PostRow.created_at.asc())
            .limit(limit)
        )
        async with self._db.session() as session:
            result = await session.execute(stmt)
            return [post_to_domain(row) for row in result.scalars().all()]

    async def get_tagged_posts_without_cluster(self) -> list[Post]:
        subq = select(ClusterPostRow.post_id)
        stmt = (
            select(PostRow)
            .where(
                PostRow.tagging_status == "tagged",
                PostRow.deleted_at.is_(None),
                PostRow.id.not_in(subq),
                PostRow.post_type.in_(ACTIONABLE_POST_TYPES),
            )
            .order_by(PostRow.created_at.asc())
        )
        async with self._db.session() as session:
            result = await session.execute(stmt)
            return [post_to_domain(row) for row in result.scalars().all()]

    async def save_tagging_results(self, results: list[TaggingResult]) -> None:
        async with self._db.session() as session:
            for tr in results:
                # Update post
                await session.execute(
                    update(PostRow)
                    .where(PostRow.id == tr.post_id)
                    .values(
                        sentiment=tr.sentiment,
                        post_type=tr.post_type,
                        tagging_status="tagged",
                    )
                )

                # Upsert tags and link
                for slug in tr.tag_slugs:
                    tag_name = slug.replace("-", " ").title()
                    tag_stmt = pg_insert(TagRow).values(
                        name=tag_name, slug=slug
                    )
                    tag_stmt = tag_stmt.on_conflict_do_nothing(
                        constraint="uq_tag_slug"
                    )
                    await session.execute(tag_stmt)

                    tag_row = await session.execute(
                        select(TagRow).where(TagRow.slug == slug)
                    )
                    tag = tag_row.scalars().first()
                    if tag:
                        link_stmt = pg_insert(PostTagRow).values(
                            post_id=tr.post_id, tag_id=tag.id
                        )
                        link_stmt = link_stmt.on_conflict_do_nothing()
                        await session.execute(link_stmt)

            await session.commit()

    async def get_existing_tag_slugs(self) -> list[str]:
        async with self._db.session() as session:
            result = await session.execute(select(TagRow.slug).order_by(TagRow.slug))
            return [r for (r,) in result]

    async def mark_tagging_failed(self, post_ids: list[int]) -> None:
        async with self._db.session() as session:
            await session.execute(
                update(PostRow)
                .where(PostRow.id.in_(post_ids))
                .values(tagging_status="failed")
            )
            await session.commit()

    async def save_clusters(self, clusters: list[ClusteringResult]) -> None:
        async with self._db.session() as session:
            now = datetime.now(UTC).replace(tzinfo=None)
            for cluster in clusters:
                stmt = (
                    pg_insert(ClusterRow)
                    .values(
                        created_at=now,
                        updated_at=now,
                        post_count=len(cluster.post_ids),
                        label=cluster.label,
                        summary=cluster.summary,
                    )
                    .returning(ClusterRow.id)
                )
                result = await session.execute(stmt)
                cluster_id = result.scalar_one()

                for post_id in cluster.post_ids:
                    link_stmt = pg_insert(ClusterPostRow).values(
                        cluster_id=cluster_id, post_id=post_id
                    )
                    link_stmt = link_stmt.on_conflict_do_nothing()
                    await session.execute(link_stmt)

            await session.commit()

    async def get_clusters_without_briefs(
        self,
    ) -> list[tuple[int, str, str, list[Post]]]:
        brief_cluster_subq = select(BriefRow.cluster_id).where(
            BriefRow.cluster_id.is_not(None)
        )
        stmt = select(ClusterRow).where(
            ClusterRow.status == "active",
            ClusterRow.id.not_in(brief_cluster_subq),
        )

        async with self._db.session() as session:
            result = await session.execute(stmt)
            clusters = result.scalars().all()

            output: list[tuple[int, str, str, list[Post]]] = []
            for c in clusters:
                post_ids_result = await session.execute(
                    select(ClusterPostRow.post_id).where(
                        ClusterPostRow.cluster_id == c.id
                    )
                )
                post_ids = [r for (r,) in post_ids_result]

                if not post_ids:
                    continue

                posts_result = await session.execute(
                    select(PostRow).where(PostRow.id.in_(post_ids))
                )
                posts = [post_to_domain(row) for row in posts_result.scalars().all()]
                output.append((c.id, c.label, c.summary or "", posts))

            return output

    async def save_brief(self, cluster_id: int, draft: BriefDraft) -> None:
        async with self._db.session() as session:
            now = datetime.now(UTC).replace(tzinfo=None)

            # Ensure slug uniqueness by appending cluster_id
            slug = f"{_slugify(draft.slug)}-{cluster_id}"

            stmt = (
                pg_insert(BriefRow)
                .values(
                    created_at=now,
                    updated_at=now,
                    published_at=now,
                    cluster_id=cluster_id,
                    source_count=len(draft.source_post_ids),
                    title=draft.title,
                    slug=slug,
                    summary=draft.summary,
                    problem_statement=draft.problem_statement,
                    opportunity=draft.opportunity,
                    status="published",
                    demand_signals=draft.demand_signals,
                    solution_directions=draft.solution_directions,
                    source_snapshots=draft.source_snapshots,
                )
                .returning(BriefRow.id)
            )
            result = await session.execute(stmt)
            brief_id = result.scalar_one()

            # Save brief_source rows
            for snapshot in draft.source_snapshots:
                post_id = snapshot.get("post_id")
                if post_id:
                    source_stmt = pg_insert(BriefSourceRow).values(
                        brief_id=brief_id,
                        post_id=post_id,
                        snippet=snapshot.get("snippet"),
                    )
                    source_stmt = source_stmt.on_conflict_do_nothing()
                    await session.execute(source_stmt)

            await session.commit()

    async def upsert_products(self, products: list[RawProduct]) -> int:
        if not products:
            return 0

        async with self._db.session() as session:
            now = datetime.now(UTC).replace(tzinfo=None)
            rows = [
                {
                    "created_at": now,
                    "updated_at": now,
                    "source": "producthunt",
                    "external_id": p.external_id,
                    "name": p.name,
                    "slug": p.slug,
                    "tagline": p.tagline,
                    "description": p.description,
                    "url": p.url,
                    "category": p.category,
                    "launched_at": p.launched_at.replace(tzinfo=None)
                    if p.launched_at and p.launched_at.tzinfo
                    else p.launched_at,
                }
                for p in products
            ]

            stmt = pg_insert(ProductRow).values(rows)
            stmt = stmt.on_conflict_do_update(
                constraint="uq_product_source_external_id",
                set_={
                    "name": stmt.excluded.name,
                    "tagline": stmt.excluded.tagline,
                    "description": stmt.excluded.description,
                    "updated_at": now,
                },
            )
            result = await session.execute(stmt)

            for p in products:
                if p.category:
                    product_row = await session.execute(
                        select(ProductRow).where(ProductRow.slug == p.slug)
                    )
                    prod = product_row.scalars().first()
                    if prod:
                        await self._link_product_tags(session, prod.id, p.category)

            await session.commit()
            return result.rowcount

    async def _link_product_tags(
        self, session: AsyncSession, product_id: int, category: str
    ) -> None:
        slug = _slugify(category)
        tag_name = category.strip().title()

        tag_stmt = pg_insert(TagRow).values(name=tag_name, slug=slug)
        tag_stmt = tag_stmt.on_conflict_do_nothing(constraint="uq_tag_slug")
        await session.execute(tag_stmt)

        tag_result = await session.execute(
            select(TagRow).where(TagRow.slug == slug)
        )
        tag = tag_result.scalars().first()
        if tag:
            link_stmt = pg_insert(ProductTagRow).values(
                product_id=product_id, tag_id=tag.id
            )
            link_stmt = link_stmt.on_conflict_do_nothing()
            await session.execute(link_stmt)

    async def find_related_products(self, keyword: str) -> list[RawProduct]:
        async with self._db.session() as session:
            # Escape LIKE metacharacters to prevent wildcard injection
            escaped = keyword.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            kw = f"%{escaped}%"
            stmt = (
                select(ProductRow)
                .where(
                    ProductRow.name.ilike(kw)
                    | ProductRow.tagline.ilike(kw)
                    | ProductRow.description.ilike(kw)
                )
                .limit(10)
            )
            result = await session.execute(stmt)
            rows = result.scalars().all()
            return [
                RawProduct(
                    external_id=r.external_id,
                    name=r.name,
                    slug=r.slug,
                    tagline=r.tagline,
                    description=r.description,
                    url=r.url,
                    category=r.category,
                    launched_at=r.launched_at,
                )
                for r in rows
            ]
