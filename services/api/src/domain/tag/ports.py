from typing import Protocol

from domain.tag.models import Tag


class TagRepository(Protocol):
    async def list_tags(self) -> list[Tag]: ...
