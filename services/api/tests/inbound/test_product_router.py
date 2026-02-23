from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from domain.post.models import PostTag
from domain.product.models import ProductMetrics
from inbound.http.product.response import (
    ProductListResponseData,
    ProductMetricsResponseData,
    ProductPostResponseData,
    RelatedBriefResponseData,
    TagResponseData,
)
from tests.conftest import build_test_app, make_post, make_product


@pytest.mark.asyncio
async def test_list_products():
    product_repo = AsyncMock()
    product_repo.list_products = AsyncMock(return_value=[make_product()])

    app = build_test_app(product_repo=product_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/products")

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 1
    assert body["data"][0]["slug"] == "notion"


@pytest.mark.asyncio
async def test_get_product_with_posts():
    product = make_product()
    posts = [make_post(1), make_post(2)]
    product_repo = AsyncMock()
    product_repo.get_product_by_slug = AsyncMock(return_value=product)
    product_repo.get_product_posts = AsyncMock(return_value=posts)
    product_repo.get_related_briefs = AsyncMock(return_value=[])

    app = build_test_app(product_repo=product_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/products/notion")

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["slug"] == "notion"
    assert len(body["data"]["posts"]) == 2


@pytest.mark.asyncio
async def test_list_products_pagination_has_next():
    # Return limit+1 products to trigger has_next and next_cursor encoding
    products = [make_product(id=i, slug=f"product-{i}") for i in range(6)]
    product_repo = AsyncMock()
    product_repo.list_products = AsyncMock(return_value=products)

    app = build_test_app(product_repo=product_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/products", params={"limit": 5})

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 5
    assert body["meta"]["has_next"] is True
    assert body["meta"]["next_cursor"] is not None


@pytest.mark.asyncio
async def test_list_products_pagination_sort_complaint_count():
    products = [make_product(id=i, slug=f"product-{i}") for i in range(6)]
    product_repo = AsyncMock()
    product_repo.list_products = AsyncMock(return_value=products)

    app = build_test_app(product_repo=product_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/products", params={"limit": 5, "sort": "-complaint_count"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["has_next"] is True
    assert body["meta"]["next_cursor"] is not None


@pytest.mark.asyncio
async def test_get_product_with_posts_has_next():
    # Return posts_limit+1 posts to trigger posts_has_next and posts_cursor encoding
    product = make_product()
    posts = [make_post(i) for i in range(12)]  # 12 > default limit of 10
    product_repo = AsyncMock()
    product_repo.get_product_by_slug = AsyncMock(return_value=product)
    product_repo.get_product_posts = AsyncMock(return_value=posts)
    product_repo.get_related_briefs = AsyncMock(return_value=[])

    app = build_test_app(product_repo=product_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/products/notion")

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]["posts"]) == 10
    assert body["meta"]["posts_has_next"] is True
    assert body["meta"]["posts_cursor"] is not None


@pytest.mark.asyncio
async def test_get_product_with_no_posts():
    product = make_product()
    product_repo = AsyncMock()
    product_repo.get_product_by_slug = AsyncMock(return_value=product)
    product_repo.get_product_posts = AsyncMock(return_value=[])
    product_repo.get_related_briefs = AsyncMock(return_value=[])

    app = build_test_app(product_repo=product_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/products/notion")

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["posts"] == []
    assert body["meta"]["posts_has_next"] is False
    assert body["meta"]["posts_cursor"] is None


@pytest.mark.asyncio
async def test_get_product_not_found():
    app = build_test_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/products/nonexistent")

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Tags in list response
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_products_includes_tags_in_response():
    """Each product in the list endpoint must include a 'tags' array."""
    tags = [PostTag(slug="productivity", name="Productivity"), PostTag(slug="saas", name="SaaS")]
    product = make_product(tags=tags)
    product_repo = AsyncMock()
    product_repo.list_products = AsyncMock(return_value=[product])

    app = build_test_app(product_repo=product_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/products")

    assert resp.status_code == 200
    body = resp.json()
    item = body["data"][0]
    assert "tags" in item
    assert len(item["tags"]) == 2
    assert item["tags"][0]["slug"] == "productivity"
    assert item["tags"][0]["name"] == "Productivity"
    assert item["tags"][1]["slug"] == "saas"
    assert item["tags"][1]["name"] == "SaaS"


@pytest.mark.asyncio
async def test_list_products_empty_tags_in_response():
    """Products with no tags return an empty tags array."""
    product = make_product(tags=[])
    product_repo = AsyncMock()
    product_repo.list_products = AsyncMock(return_value=[product])

    app = build_test_app(product_repo=product_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/products")

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"][0]["tags"] == []


# ---------------------------------------------------------------------------
# Metrics in detail response
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_product_detail_includes_metrics():
    """The product detail endpoint must include a 'metrics' object."""
    product = make_product()
    metrics = ProductMetrics(total_mentions=42, negative_count=15, sentiment_score=64)
    product_repo = AsyncMock()
    product_repo.get_product_by_slug = AsyncMock(return_value=product)
    product_repo.get_product_posts = AsyncMock(return_value=[])
    product_repo.get_product_metrics = AsyncMock(return_value=metrics)
    product_repo.get_related_briefs = AsyncMock(return_value=[])

    app = build_test_app(product_repo=product_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/products/notion")

    assert resp.status_code == 200
    body = resp.json()
    assert "metrics" in body["data"]
    m = body["data"]["metrics"]
    assert m["total_mentions"] == 42
    assert m["negative_count"] == 15
    assert m["sentiment_score"] == 64


@pytest.mark.asyncio
async def test_get_product_detail_includes_tags():
    """The product detail endpoint must include a 'tags' array in the product data."""
    tags = [PostTag(slug="dev-tools", name="Dev Tools")]
    product = make_product(tags=tags)
    metrics = ProductMetrics(total_mentions=5, negative_count=1, sentiment_score=80)
    product_repo = AsyncMock()
    product_repo.get_product_by_slug = AsyncMock(return_value=product)
    product_repo.get_product_posts = AsyncMock(return_value=[])
    product_repo.get_product_metrics = AsyncMock(return_value=metrics)
    product_repo.get_related_briefs = AsyncMock(return_value=[])

    app = build_test_app(product_repo=product_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/products/notion")

    assert resp.status_code == 200
    body = resp.json()
    assert "tags" in body["data"]
    assert len(body["data"]["tags"]) == 1
    assert body["data"]["tags"][0]["slug"] == "dev-tools"
    assert body["data"]["tags"][0]["name"] == "Dev Tools"


@pytest.mark.asyncio
async def test_get_product_detail_metrics_zero_values():
    """Metrics with all zero values must be serialized correctly."""
    product = make_product()
    metrics = ProductMetrics(total_mentions=0, negative_count=0, sentiment_score=0)
    product_repo = AsyncMock()
    product_repo.get_product_by_slug = AsyncMock(return_value=product)
    product_repo.get_product_posts = AsyncMock(return_value=[])
    product_repo.get_product_metrics = AsyncMock(return_value=metrics)
    product_repo.get_related_briefs = AsyncMock(return_value=[])

    app = build_test_app(product_repo=product_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/products/notion")

    assert resp.status_code == 200
    body = resp.json()
    m = body["data"]["metrics"]
    assert m["total_mentions"] == 0
    assert m["negative_count"] == 0
    assert m["sentiment_score"] == 0


# ---------------------------------------------------------------------------
# Response model unit tests: TagResponseData
# ---------------------------------------------------------------------------


def test_tag_response_data_fields():
    tag = TagResponseData(slug="payments", name="Payments")
    assert tag.slug == "payments"
    assert tag.name == "Payments"


def test_tag_response_data_serializes_to_dict():
    tag = TagResponseData(slug="ai-ml", name="AI/ML")
    d = tag.model_dump()
    assert d == {"slug": "ai-ml", "name": "AI/ML"}


# ---------------------------------------------------------------------------
# Response model unit tests: ProductMetricsResponseData
# ---------------------------------------------------------------------------


def test_product_metrics_response_data_from_domain():
    metrics = ProductMetrics(total_mentions=100, negative_count=40, sentiment_score=60)
    response = ProductMetricsResponseData.from_domain(metrics)

    assert response.total_mentions == 100
    assert response.negative_count == 40
    assert response.sentiment_score == 60


def test_product_metrics_response_data_serializes():
    metrics = ProductMetrics(total_mentions=5, negative_count=2, sentiment_score=60)
    response = ProductMetricsResponseData.from_domain(metrics)
    d = response.model_dump()

    assert d == {"total_mentions": 5, "negative_count": 2, "sentiment_score": 60}


def test_product_metrics_response_data_zero_values():
    metrics = ProductMetrics(total_mentions=0, negative_count=0, sentiment_score=0)
    response = ProductMetricsResponseData.from_domain(metrics)
    assert response.total_mentions == 0
    assert response.negative_count == 0
    assert response.sentiment_score == 0


# ---------------------------------------------------------------------------
# Response model unit tests: ProductListResponseData
# ---------------------------------------------------------------------------


def test_product_list_response_data_from_domain_with_tags():
    """from_domain must map product.tags to TagResponseData objects."""
    tags = [PostTag(slug="productivity", name="Productivity"), PostTag(slug="saas", name="SaaS")]
    product = make_product(tags=tags)
    response = ProductListResponseData.from_domain(product)

    assert len(response.tags) == 2
    assert isinstance(response.tags[0], TagResponseData)
    assert response.tags[0].slug == "productivity"
    assert response.tags[1].slug == "saas"


def test_product_list_response_data_from_domain_empty_tags():
    product = make_product(tags=[])
    response = ProductListResponseData.from_domain(product)
    assert response.tags == []


def test_product_list_response_data_from_domain_all_fields():
    product = make_product(id=5, slug="stripe", name="Stripe", complaint_count=20, trending_score=9.0)
    response = ProductListResponseData.from_domain(product)

    assert response.id == 5
    assert response.slug == "stripe"
    assert response.name == "Stripe"
    assert response.complaint_count == 20
    assert response.trending_score == 9.0
    assert response.source == "producthunt"


# ---------------------------------------------------------------------------
# Response model unit tests: ProductPostResponseData
# ---------------------------------------------------------------------------


def test_product_post_response_data_from_domain():
    post = make_post(id=3, title="Bad experience", sentiment="negative")
    response = ProductPostResponseData.from_domain(post)

    assert response.id == 3
    assert response.title == "Bad experience"
    assert response.sentiment == "negative"
    assert response.source == "reddit"


def test_product_post_response_data_none_fields():
    post = make_post(body=None, subreddit=None, sentiment=None)
    response = ProductPostResponseData.from_domain(post)

    assert response.body is None
    assert response.subreddit is None
    assert response.sentiment is None
