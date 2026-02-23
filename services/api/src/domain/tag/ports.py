from typing import Protocol

from domain.tag.models import Tag


class TagRepository(Protocol):
    async def list_tags(self) -> list[Tag]: ...

    async def list_trending_tags(
        self, days: int, limit: int
    ) -> list[Tag]: ...

    async def list_product_tags(self, days: int, limit: int) -> list[Tag]: ...
