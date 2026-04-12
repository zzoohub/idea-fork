from sqlalchemy import func, select, text

from domain.post.models import Post, PostTag
from domain.product.models import Product, ProductListParams, ProductMetrics, RelatedBrief
from outbound.postgres.database import Database
from outbound.postgres.mapper import post_to_domain, product_to_domain
from outbound.postgres.models import (
    PostRow,
    PostTagRow,
    ProductRow,
    ProductTagRow,
    TagRow,
)
from shared.pagination import decode_cursor

SORT_COLUMN_MAP = {
    "-trending_score": ProductRow.trending_score,
    "-signal_count": ProductRow.signal_count,
    "-launched_at": ProductRow.launched_at,
}

SORT_RAW_MAP = {
    "-trending_score": "trending_score",
    "-signal_count": "signal_count",
    "-launched_at": "launched_at",
}

_NULLABLE_SORT_COLS = {"launched_at"}

_PERIOD_INTERVALS = {"7d": "7 days", "30d": "30 days", "90d": "90 days"}


class PostgresProductRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def list_products(self, params: ProductListParams) -> list[Product]:
        sort_col = SORT_RAW_MAP[params.sort]
        nullable = sort_col in _NULLABLE_SORT_COLS
        nulls_last = " NULLS LAST" if nullable else ""
        bind_params: dict = {}

        where_clause = self._build_where_clause(params, bind_params)
        cursor_clause = self._build_cursor_clause(params, sort_col, nullable, bind_params)

        sql = f"""
            SELECT g.id, g.name, g.slug, g.source, g.external_id,
                   g.tagline, g.description, g.url, g.image_url,
                   g.category, g.launched_at, g.signal_count,
                   g.trending_score,
                   (SELECT array_agg(DISTINCT p2.source)
                    FROM product p2
                    WHERE lower(p2.name) = lower(g.name)) AS sources
            FROM (
                SELECT DISTINCT ON (lower(name))
                    id, name, slug, source, external_id, tagline, description,
                    url, image_url, category, launched_at,
                    signal_count, trending_score, created_at
                FROM product
                {where_clause}
                ORDER BY lower(name), {sort_col} DESC{nulls_last}, id DESC
            ) g
            {cursor_clause}
            ORDER BY g.{sort_col} DESC{nulls_last}, g.id DESC
            LIMIT :limit
        """
        bind_params["limit"] = params.limit + 1

        async with self._db.session() as session:
            result = await session.execute(text(sql), bind_params)
            rows = result.fetchall()
            tag_map = await self._load_tags_for_products(
                session, [row.id for row in rows]
            )
            return [self._row_to_product(row, tag_map.get(row.id, [])) for row in rows]

    def _build_where_clause(
        self, params: ProductListParams, bind_params: dict,
    ) -> str:
        parts: list[str] = []
        if params.q:
            parts.append("(name ILIKE :q OR tagline ILIKE :q OR description ILIKE :q)")
            bind_params["q"] = f"%{params.q}%"
        if params.category:
            parts.append("category = :category")
            bind_params["category"] = params.category
        if params.period and params.period in _PERIOD_INTERVALS:
            parts.append(
                f"created_at >= now() - interval '{_PERIOD_INTERVALS[params.period]}'"
            )
        return f"WHERE {' AND '.join(parts)}" if parts else ""

    def _build_cursor_clause(
        self,
        params: ProductListParams,
        sort_col: str,
        nullable: bool,
        bind_params: dict,
    ) -> str:
        if not params.cursor:
            return ""
        cursor_values = decode_cursor(params.cursor)
        cursor_v = cursor_values.get("v")
        cursor_id = cursor_values.get("id")
        if cursor_v is not None and cursor_id is not None:
            bind_params["cursor_v"] = cursor_v
            bind_params["cursor_id"] = cursor_id
            return (
                f"WHERE (g.{sort_col} < :cursor_v "
                f"OR (g.{sort_col} = :cursor_v AND g.id < :cursor_id))"
            )
        if nullable and cursor_id is not None:
            bind_params["cursor_id"] = cursor_id
            return f"WHERE (g.{sort_col} IS NULL AND g.id < :cursor_id)"
        return ""

    @staticmethod
    async def _load_tags_for_products(session, product_ids: list[int]) -> dict[int, list[PostTag]]:
        if not product_ids:
            return {}
        rows = await session.execute(
            select(ProductTagRow.product_id, TagRow.slug, TagRow.name)
            .join(TagRow, TagRow.id == ProductTagRow.tag_id)
            .where(ProductTagRow.product_id.in_(product_ids))
        )
        tag_map: dict[int, list[PostTag]] = {}
        for pid, slug, name in rows:
            tag_map.setdefault(pid, []).append(PostTag(slug=slug, name=name))
        return tag_map

    @staticmethod
    def _row_to_product(row, tags: list[PostTag]) -> Product:
        return Product(
            id=row.id,
            slug=row.slug,
            name=row.name,
            source=row.source,
            external_id=row.external_id,
            tagline=row.tagline,
            description=row.description,
            url=row.url,
            image_url=row.image_url,
            category=row.category,
            launched_at=row.launched_at,
            signal_count=row.signal_count,
            trending_score=float(row.trending_score),
            tags=tags,
            sources=list(row.sources) if row.sources else [row.source],
        )

    async def get_product_by_slug(self, slug: str) -> Product | None:
        stmt = select(ProductRow).where(ProductRow.slug == slug)
        async with self._db.session() as session:
            result = await session.execute(stmt)
            row = result.scalars().first()
            if row is None:
                return None
            product = product_to_domain(row)
            sources_result = await session.execute(
                text(
                    "SELECT array_agg(DISTINCT source) FROM product WHERE lower(name) = lower(:name)"
                ),
                {"name": row.name},
            )
            sources_row = sources_result.fetchone()
            all_sources = list(sources_row[0]) if sources_row and sources_row[0] else [row.source]
            return Product(
                id=product.id,
                slug=product.slug,
                name=product.name,
                source=product.source,
                external_id=product.external_id,
                tagline=product.tagline,
                description=product.description,
                url=product.url,
                image_url=product.image_url,
                category=product.category,
                launched_at=product.launched_at,
                signal_count=product.signal_count,
                trending_score=product.trending_score,
                tags=product.tags,
                sources=all_sources,
            )

    async def get_product_posts(
        self, product_id: int, limit: int = 10
    ) -> list[Post]:
        tag_ids_subq = select(ProductTagRow.tag_id).where(
            ProductTagRow.product_id == product_id
        )
        post_ids_subq = (
            select(PostTagRow.post_id)
            .where(PostTagRow.tag_id.in_(tag_ids_subq))
            .distinct()
        )
        stmt = (
            select(PostRow)
            .where(
                PostRow.id.in_(post_ids_subq),
                PostRow.deleted_at.is_(None),
            )
            .order_by(PostRow.id.desc())
            .limit(limit + 1)
        )
        async with self._db.session() as session:
            result = await session.execute(stmt)
            return [post_to_domain(row) for row in result.scalars().all()]

    async def get_product_metrics(self, product_id: int) -> ProductMetrics:
        tag_ids_subq = select(ProductTagRow.tag_id).where(
            ProductTagRow.product_id == product_id
        )
        matching_posts_subq = (
            select(PostTagRow.post_id)
            .where(PostTagRow.tag_id.in_(tag_ids_subq))
            .distinct()
        )

        stmt = select(
            func.count().label("total"),
            func.count()
            .filter(PostRow.sentiment == "negative")
            .label("negative"),
            func.count()
            .filter(PostRow.sentiment == "positive")
            .label("positive"),
        ).where(
            PostRow.id.in_(matching_posts_subq),
            PostRow.deleted_at.is_(None),
        )

        async with self._db.session() as session:
            result = await session.execute(stmt)
            row = result.one()
            total = row.total
            negative = row.negative
            positive = row.positive
            score = round(positive / max(positive + negative, 1) * 100)
            return ProductMetrics(
                total_mentions=total,
                negative_count=negative,
                sentiment_score=score,
            )

    async def get_related_briefs(
        self, product_id: int, limit: int = 3
    ) -> list[RelatedBrief]:
        sql = text("""
            SELECT DISTINCT b.id, b.slug, b.title, b.summary, b.source_count
            FROM brief b
            JOIN brief_source bs ON bs.brief_id = b.id
            JOIN product_post pp ON pp.post_id = bs.post_id
            WHERE pp.product_id = :product_id
              AND b.status = 'published'
            ORDER BY b.source_count DESC
            LIMIT :limit
        """)
        async with self._db.session() as session:
            result = await session.execute(
                sql, {"product_id": product_id, "limit": limit}
            )
            return [
                RelatedBrief(
                    id=row.id,
                    slug=row.slug,
                    title=row.title,
                    summary=row.summary,
                    source_count=row.source_count,
                )
                for row in result.fetchall()
            ]
