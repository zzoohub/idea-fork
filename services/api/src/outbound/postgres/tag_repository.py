from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from domain.tag.models import Tag
from outbound.postgres.database import Database
from outbound.postgres.mapper import tag_to_domain
from outbound.postgres.models import PostRow, PostTagRow, ProductRow, ProductTagRow, TagRow


class PostgresTagRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def list_tags(self) -> list[Tag]:
        async with self._db.session() as session:
            result = await session.execute(select(TagRow).order_by(TagRow.name))
            return [tag_to_domain(row) for row in result.scalars().all()]

    async def list_trending_tags(
        self, days: int = 7, limit: int = 10
    ) -> list[Tag]:
        cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=days)
        stmt = (
            select(TagRow, func.count(PostTagRow.post_id).label("post_count"))
            .join(PostTagRow, PostTagRow.tag_id == TagRow.id)
            .join(PostRow, PostRow.id == PostTagRow.post_id)
            .where(
                PostRow.external_created_at >= cutoff,
                PostRow.deleted_at.is_(None),
            )
            .group_by(TagRow.id)
            .order_by(func.count(PostTagRow.post_id).desc())
            .limit(limit)
        )
        async with self._db.session() as session:
            result = await session.execute(stmt)
            return [tag_to_domain(row) for row, _ in result.all()]

    async def list_product_tags(
        self, days: int = 7, limit: int = 20
    ) -> list[Tag]:
        cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=days)
        stmt = (
            select(
                TagRow,
                func.count(ProductTagRow.product_id).label("product_count"),
            )
            .join(ProductTagRow, ProductTagRow.tag_id == TagRow.id)
            .join(ProductRow, ProductRow.id == ProductTagRow.product_id)
            .where(ProductRow.created_at >= cutoff)
            .group_by(TagRow.id)
            .order_by(func.count(ProductTagRow.product_id).desc())
            .limit(limit)
        )
        async with self._db.session() as session:
            result = await session.execute(stmt)
            return [tag_to_domain(row) for row, _ in result.all()]
