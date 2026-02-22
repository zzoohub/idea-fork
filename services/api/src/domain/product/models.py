from dataclasses import dataclass, field
from datetime import datetime

from domain.post.models import Post


@dataclass(frozen=True)
class Product:
    id: int
    slug: str
    name: str
    source: str
    external_id: str
    tagline: str | None
    description: str | None
    url: str | None
    image_url: str | None
    category: str | None
    launched_at: datetime | None
    complaint_count: int
    trending_score: float


@dataclass(frozen=True)
class ProductWithPosts:
    product: Product
    posts: list[Post] = field(default_factory=list)


@dataclass
class ProductListParams:
    cursor: str | None = None
    limit: int = 20
    sort: str = "-trending_score"
    category: str | None = None
