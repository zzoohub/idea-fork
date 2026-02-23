from dataclasses import dataclass, field
from datetime import datetime

from domain.post.models import Post, PostTag


@dataclass(frozen=True)
class ProductMetrics:
    total_mentions: int
    negative_count: int
    sentiment_score: int


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
    tags: list[PostTag] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)


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
    period: str | None = None
