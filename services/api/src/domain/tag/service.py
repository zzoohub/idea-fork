from domain.tag.models import Tag
from domain.tag.ports import TagRepository


class TagService:
    def __init__(self, repo: TagRepository) -> None:
        self._repo = repo

    async def list_tags(self) -> list[Tag]:
        return await self._repo.list_tags()

    async def list_trending_tags(
        self, days: int = 7, limit: int = 10
    ) -> list[Tag]:
        return await self._repo.list_trending_tags(days, limit)

    async def list_product_tags(self, limit: int = 20) -> list[Tag]:
        return await self._repo.list_product_tags(limit)
