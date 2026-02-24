from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.orm import aliased

from domain.post.models import Post, PostTag
from domain.product.models import Product, ProductListParams, ProductMetrics, RelatedBrief
from outbound.postgres.database import Database
from outbound.postgres.mapper import post_to_domain, product_to_domain
from outbound.postgres.models import (
    PostRow,
    PostTagRow,
    ProductRow,
    ProductTagRow,
)
from shared.pagination import cast_cursor_value, decode_cursor

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


class PostgresProductRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def list_products(self, params: ProductListParams) -> list[Product]:
        sort_col_name = SORT_RAW_MAP[params.sort]
        period_intervals = {"7d": "7 days", "30d": "30 days", "90d": "90 days"}

        # Build WHERE conditions for inner query
        where_parts: list[str] = []
        bind_params: dict = {}

        if params.q:
            where_parts.append(
                "(name ILIKE :q OR tagline ILIKE :q OR description ILIKE :q)"
            )
            bind_params["q"] = f"%{params.q}%"

        if params.category:
            where_parts.append("category = :category")
            bind_params["category"] = params.category

        if params.period and params.period in period_intervals:
            where_parts.append(
                f"created_at >= now() - interval '{period_intervals[params.period]}'"
            )

        where_clause = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""

        nullable = sort_col_name in _NULLABLE_SORT_COLS
        nulls_last = " NULLS LAST" if nullable else ""

        # Step 1: Get grouped products (best row per normalized name)
        grouped_sql = f"""
            SELECT DISTINCT ON (lower(name))
                id, name, slug, source, external_id, tagline, description,
                url, image_url, category, launched_at,
                signal_count, trending_score, created_at
            FROM product
            {where_clause}
            ORDER BY lower(name), {sort_col_name} DESC{nulls_last}, id DESC
        """

        # Build cursor pagination clause for wrapper
        cursor_clause = ""
        if params.cursor:
            cursor_values = decode_cursor(params.cursor)
            cursor_v = cursor_values.get("v")
            cursor_id = cursor_values.get("id")
            if cursor_v is not None and cursor_id is not None:
                cursor_clause = f"WHERE (g.{sort_col_name} < :cursor_v OR (g.{sort_col_name} = :cursor_v AND g.id < :cursor_id))"
                bind_params["cursor_v"] = cursor_v
                bind_params["cursor_id"] = cursor_id
            elif nullable and cursor_id is not None:
                # Cursor is on a NULL row — only return other NULL rows with smaller id
                cursor_clause = f"WHERE (g.{sort_col_name} IS NULL AND g.id < :cursor_id)"
                bind_params["cursor_id"] = cursor_id

        wrapper_sql = f"""
            SELECT g.id, g.name, g.slug, g.source, g.external_id,
                   g.tagline, g.description, g.url, g.image_url,
                   g.category, g.launched_at, g.signal_count,
                   g.trending_score,
                   (SELECT array_agg(DISTINCT p2.source)
                    FROM product p2
                    WHERE lower(p2.name) = lower(g.name)) AS sources
            FROM ({grouped_sql}) g
            {cursor_clause}
            ORDER BY g.{sort_col_name} DESC{nulls_last}, g.id DESC
            LIMIT :limit
        """
        bind_params["limit"] = params.limit + 1

        async with self._db.session() as session:
            result = await session.execute(text(wrapper_sql), bind_params)
            rows = result.fetchall()

            products: list[Product] = []
            for row in rows:
                # Load tags for this product
                tag_result = await session.execute(
                    select(ProductTagRow.tag_id).where(
                        ProductTagRow.product_id == row.id
                    )
                )
                tag_ids = [r for (r,) in tag_result]
                tags: list[PostTag] = []
                if tag_ids:
                    from outbound.postgres.models import TagRow
                    tag_rows = await session.execute(
                        select(TagRow).where(TagRow.id.in_(tag_ids))
                    )
                    tags = [PostTag(slug=t.slug, name=t.name) for t in tag_rows.scalars().all()]

                products.append(Product(
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
                ))
            return products

    async def get_product_by_slug(self, slug: str) -> Product | None:
        stmt = select(ProductRow).where(ProductRow.slug == slug)
        async with self._db.session() as session:
            result = await session.execute(stmt)
            row = result.scalars().first()
            if row is None:
                return None
            product = product_to_domain(row)
            # Aggregate all sources for products with the same name
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

    def _apply_cursor(self, stmt, cursor: str | None, sort_col):
        if cursor is None:
            return stmt

        values = decode_cursor(cursor)
        cursor_sort_val = cast_cursor_value(values.get("v"), sort_col)
        cursor_id = values.get("id")

        return stmt.where(
            or_(
                sort_col < cursor_sort_val,
                and_(
                    sort_col == cursor_sort_val, ProductRow.id < cursor_id
                ),
            )
        )
