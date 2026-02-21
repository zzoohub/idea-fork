from typing import Protocol

from domain.brief.models import Brief, BriefListParams


class BriefRepository(Protocol):
    async def list_briefs(self, params: BriefListParams) -> list[Brief]: ...

    async def get_brief_by_slug(self, slug: str) -> Brief | None: ...

    async def get_brief_by_id(self, brief_id: int) -> Brief | None: ...
