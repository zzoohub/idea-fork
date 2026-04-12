from datetime import datetime
from typing import Self

from domain.product.models import Product
from inbound.http.response import ResponseData, TagData


class ProductListResponseData(ResponseData):
    id: int
    slug: str
    name: str
    tagline: str | None
    description: str | None
    url: str | None
    image_url: str | None
    category: str | None
    source: str
    sources: list[str]
    launched_at: datetime | None
    signal_count: int
    trending_score: float
    tags: list[TagData]

    @classmethod
    def from_domain(cls, product: Product) -> Self:
        obj = cls.model_validate(product)
        if not obj.sources:
            obj.sources = [obj.source]
        return obj


class ProductPostResponseData(ResponseData):
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


class RelatedBriefResponseData(ResponseData):
    id: int
    slug: str
    title: str
    summary: str
    source_count: int


class ProductMetricsResponseData(ResponseData):
    total_mentions: int
    negative_count: int
    sentiment_score: int
