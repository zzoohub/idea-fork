from dataclasses import dataclass


@dataclass(frozen=True)
class Tag:
    id: int
    slug: str
    name: str
