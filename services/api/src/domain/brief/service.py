from domain.brief.errors import BriefNotFoundError
from domain.brief.models import Brief, BriefListParams
from domain.brief.ports import BriefRepository


class BriefService:
    def __init__(self, repo: BriefRepository) -> None:
        self._repo = repo

    async def list_briefs(self, params: BriefListParams) -> list[Brief]:
        return await self._repo.list_briefs(params)

    async def get_brief_by_slug(self, slug: str) -> Brief:
        brief = await self._repo.get_brief_by_slug(slug)
        if brief is None:
            raise BriefNotFoundError(slug)
        return brief

    async def get_brief_by_id(self, brief_id: int) -> Brief:
        brief = await self._repo.get_brief_by_id(brief_id)
        if brief is None:
            raise BriefNotFoundError(str(brief_id))
        return brief
