from domain.tag.models import Tag
from domain.tag.ports import TagRepository


class TagService:
    def __init__(self, repo: TagRepository) -> None:
        self._repo = repo

    async def list_tags(self) -> list[Tag]:
        return await self._repo.list_tags()
