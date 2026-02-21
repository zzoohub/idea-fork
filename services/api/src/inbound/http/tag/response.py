from pydantic import BaseModel

from domain.tag.models import Tag


class TagResponseData(BaseModel):
    id: int
    slug: str
    name: str

    @classmethod
    def from_domain(cls, tag: Tag) -> "TagResponseData":
        return cls(id=tag.id, slug=tag.slug, name=tag.name)
