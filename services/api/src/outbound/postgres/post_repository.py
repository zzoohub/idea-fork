from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.orm import selectinload

from domain.post.models import Post, PostListParams
from outbound.postgres.database import Database
from outbound.postgres.mapper import post_to_domain
from outbound.postgres.models import PostRow, PostTagRow, ProductPostRow, TagRow
from shared.pagination import cast_cursor_value, decode_cursor

SORT_COLUMN_MAP = {
    "-external_created_at": PostRow.external_created_at,
    "-score": PostRow.score,
    "-num_comments": PostRow.num_comments,
}


class PostgresPostRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def list_posts(self, params: PostListParams) -> list[Post]:
        sort_col = SORT_COLUMN_MAP[params.sort]
        stmt = (
            select(PostRow)
            .where(PostRow.deleted_at.is_(None))
            .options(selectinload(PostRow.tags))
            .order_by(sort_col.desc(), PostRow.id.desc())
        )
        stmt = self._apply_filters(stmt, params)
        stmt = self._apply_cursor(stmt, params.cursor, sort_col)
        stmt = stmt.limit(params.limit + 1)

        async with self._db.session() as session:
            result = await session.execute(stmt)
            return [post_to_domain(row) for row in result.scalars().unique().all()]

    async def get_post(self, post_id: int) -> Post | None:
        stmt = (
            select(PostRow)
            .where(PostRow.id == post_id, PostRow.deleted_at.is_(None))
            .options(selectinload(PostRow.tags))
        )
        async with self._db.session() as session:
            result = await session.execute(stmt)
            row = result.scalars().first()
            return post_to_domain(row) if row else None

    def _apply_filters(self, stmt: Select, params: PostListParams) -> Select:
        if params.tag:
            tag_slugs = [s.strip() for s in params.tag.split(",")]
            stmt = stmt.join(PostTagRow, PostTagRow.post_id == PostRow.id).join(
                TagRow, TagRow.id == PostTagRow.tag_id
            ).where(TagRow.slug.in_(tag_slugs))

        if params.source:
            stmt = stmt.where(PostRow.source == params.source)

        if params.subreddit:
            stmt = stmt.where(PostRow.subreddit == params.subreddit)

        if params.sentiment:
            stmt = stmt.where(PostRow.sentiment == params.sentiment)

        if params.product:
            from outbound.postgres.models import ProductRow

            stmt = stmt.join(
                ProductPostRow, ProductPostRow.post_id == PostRow.id
            ).join(
                ProductRow, ProductRow.id == ProductPostRow.product_id
            ).where(ProductRow.slug == params.product)

        if params.post_type:
            stmt = stmt.where(PostRow.post_type == params.post_type)

        if params.q:
            stmt = stmt.where(
                func.to_tsvector(
                    "english",
                    func.coalesce(PostRow.title, "")
                    + " "
                    + func.coalesce(PostRow.body, ""),
                ).match(params.q)
            )

        return stmt

    def _apply_cursor(self, stmt: Select, cursor: str | None, sort_col) -> Select:
        if cursor is None:
            return stmt

        values = decode_cursor(cursor)
        cursor_sort_val = cast_cursor_value(values.get("v"), sort_col)
        cursor_id = values.get("id")

        return stmt.where(
            or_(
                sort_col < cursor_sort_val,
                and_(sort_col == cursor_sort_val, PostRow.id < cursor_id),
            )
        )
