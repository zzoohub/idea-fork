from sqlalchemy import select

from domain.tag.models import Tag
from outbound.postgres.database import Database
from outbound.postgres.mapper import tag_to_domain
from outbound.postgres.models import TagRow


class PostgresTagRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def list_tags(self) -> list[Tag]:
        async with self._db.session() as session:
            result = await session.execute(select(TagRow).order_by(TagRow.name))
            return [tag_to_domain(row) for row in result.scalars().all()]
