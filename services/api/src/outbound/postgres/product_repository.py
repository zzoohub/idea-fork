from sqlalchemy import and_, func, or_, select

from domain.post.models import Post
from domain.product.models import Product, ProductListParams, ProductMetrics
from outbound.postgres.database import Database
from outbound.postgres.mapper import post_to_domain, product_to_domain
from outbound.postgres.models import (
    PostRow,
    PostTagRow,
    ProductRow,
    ProductTagRow,
)
from shared.pagination import decode_cursor

SORT_COLUMN_MAP = {
    "-trending_score": ProductRow.trending_score,
    "-complaint_count": ProductRow.complaint_count,
}


class PostgresProductRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def list_products(self, params: ProductListParams) -> list[Product]:
        sort_col = SORT_COLUMN_MAP[params.sort]
        stmt = select(ProductRow).order_by(sort_col.desc(), ProductRow.id.desc())

        if params.category:
            stmt = stmt.where(ProductRow.category == params.category)

        stmt = self._apply_cursor(stmt, params.cursor, sort_col)
        stmt = stmt.limit(params.limit + 1)

        async with self._db.session() as session:
            result = await session.execute(stmt)
            return [product_to_domain(row) for row in result.scalars().all()]

    async def get_product_by_slug(self, slug: str) -> Product | None:
        stmt = select(ProductRow).where(ProductRow.slug == slug)
        async with self._db.session() as session:
            result = await session.execute(stmt)
            row = result.scalars().first()
            return product_to_domain(row) if row else None

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

    def _apply_cursor(self, stmt, cursor: str | None, sort_col):
        if cursor is None:
            return stmt

        values = decode_cursor(cursor)
        cursor_sort_val = values.get("v")
        cursor_id = values.get("id")

        return stmt.where(
            or_(
                sort_col < cursor_sort_val,
                and_(
                    sort_col == cursor_sort_val, ProductRow.id < cursor_id
                ),
            )
        )
