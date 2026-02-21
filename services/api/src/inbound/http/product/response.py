from datetime import datetime

from pydantic import BaseModel

from domain.post.models import Post
from domain.product.models import Product


class ProductListResponseData(BaseModel):
    id: int
    slug: str
    name: str
    description: str | None
    url: str | None
    image_url: str | None
    category: str | None
    complaint_count: int
    trending_score: float

    @classmethod
    def from_domain(cls, product: Product) -> "ProductListResponseData":
        return cls(
            id=product.id,
            slug=product.slug,
            name=product.name,
            description=product.description,
            url=product.url,
            image_url=product.image_url,
            category=product.category,
            complaint_count=product.complaint_count,
            trending_score=product.trending_score,
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
    post_type: str | None
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
            post_type=post.post_type,
            sentiment=post.sentiment,
        )
