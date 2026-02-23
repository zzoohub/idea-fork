from datetime import datetime

from pydantic import BaseModel

from domain.post.models import Post
from domain.product.models import Product, ProductMetrics


class TagResponseData(BaseModel):
    slug: str
    name: str


class ProductListResponseData(BaseModel):
    id: int
    slug: str
    name: str
    tagline: str | None
    description: str | None
    url: str | None
    image_url: str | None
    category: str | None
    source: str
    launched_at: datetime | None
    complaint_count: int
    trending_score: float
    tags: list[TagResponseData]

    @classmethod
    def from_domain(cls, product: Product) -> "ProductListResponseData":
        return cls(
            id=product.id,
            slug=product.slug,
            name=product.name,
            tagline=product.tagline,
            description=product.description,
            url=product.url,
            image_url=product.image_url,
            category=product.category,
            source=product.source,
            launched_at=product.launched_at,
            complaint_count=product.complaint_count,
            trending_score=product.trending_score,
            tags=[TagResponseData(slug=t.slug, name=t.name) for t in product.tags],
        )


class ProductPostResponseData(BaseModel):
    id: int
    title: str
    body: str | None
    source: str
    subreddit: str | None
    external_url: str
    external_created_at: datetime
    score: int
    sentiment: str | None

    @classmethod
    def from_domain(cls, post: Post) -> "ProductPostResponseData":
        return cls(
            id=post.id,
            title=post.title,
            body=post.body,
            source=post.source,
            subreddit=post.subreddit,
            external_url=post.external_url,
            external_created_at=post.external_created_at,
            score=post.score,
            sentiment=post.sentiment,
        )


class ProductMetricsResponseData(BaseModel):
    total_mentions: int
    negative_count: int
    sentiment_score: int

    @classmethod
    def from_domain(cls, metrics: ProductMetrics) -> "ProductMetricsResponseData":
        return cls(
            total_mentions=metrics.total_mentions,
            negative_count=metrics.negative_count,
            sentiment_score=metrics.sentiment_score,
        )
