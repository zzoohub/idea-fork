from sqlalchemy import select

from domain.brief.models import Brief, BriefListParams
from outbound.postgres.database import Database
from outbound.postgres.mapper import brief_to_domain
from outbound.postgres.models import BriefRow
from shared.pagination import apply_cursor

SORT_COLUMN_MAP = {
    "-published_at": BriefRow.published_at,
    "-upvote_count": BriefRow.upvote_count,
    "-source_count": BriefRow.source_count,
}


class PostgresBriefRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def list_briefs(self, params: BriefListParams) -> list[Brief]:
        sort_col = SORT_COLUMN_MAP[params.sort]
        stmt = (
            select(BriefRow)
            .where(BriefRow.status == "published")
            .order_by(sort_col.desc(), BriefRow.id.desc())
        )
        stmt = apply_cursor(stmt, params.cursor, sort_col, BriefRow.id)
        stmt = stmt.limit(params.limit + 1)

        async with self._db.session() as session:
            result = await session.execute(stmt)
            return [brief_to_domain(row) for row in result.scalars().all()]

    async def get_brief_by_slug(self, slug: str) -> Brief | None:
        stmt = select(BriefRow).where(
            BriefRow.slug == slug, BriefRow.status == "published"
        )
        async with self._db.session() as session:
            result = await session.execute(stmt)
            row = result.scalars().first()
            return brief_to_domain(row) if row else None

    async def get_brief_by_id(self, brief_id: int) -> Brief | None:
        stmt = select(BriefRow).where(
            BriefRow.id == brief_id, BriefRow.status == "published"
        )
        async with self._db.session() as session:
            result = await session.execute(stmt)
            row = result.scalars().first()
            return brief_to_domain(row) if row else None

