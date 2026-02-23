from unittest.mock import AsyncMock

import pytest

from domain.post.models import PostTag
from domain.product.errors import ProductNotFoundError
from domain.product.models import Product, ProductListParams, ProductMetrics
from domain.product.service import ProductService
from tests.conftest import make_post, make_product


@pytest.mark.asyncio
async def test_list_products_delegates_to_repo():
    repo = AsyncMock()
    repo.list_products = AsyncMock(return_value=[make_product(1)])
    svc = ProductService(repo)

    params = ProductListParams()
    result = await svc.list_products(params)
    assert len(result) == 1
    repo.list_products.assert_called_once_with(params)


@pytest.mark.asyncio
async def test_get_product_by_slug_found_returns_product_and_posts():
    product = make_product(id=10, slug="notion")
    posts = [make_post(1), make_post(2)]
    metrics = ProductMetrics(total_mentions=2, negative_count=1, sentiment_score=50)
    repo = AsyncMock()
    repo.get_product_by_slug = AsyncMock(return_value=product)
    repo.get_product_posts = AsyncMock(return_value=posts)
    repo.get_product_metrics = AsyncMock(return_value=metrics)
    svc = ProductService(repo)

    result_product, result_posts, result_metrics = await svc.get_product_by_slug("notion", posts_limit=5)
    assert result_product.slug == "notion"
    assert len(result_posts) == 2
    assert result_metrics.total_mentions == 2
    repo.get_product_by_slug.assert_called_once_with("notion")
    repo.get_product_posts.assert_called_once_with(10, 5)
    repo.get_product_metrics.assert_called_once_with(10)


@pytest.mark.asyncio
async def test_get_product_by_slug_not_found_raises():
    repo = AsyncMock()
    repo.get_product_by_slug = AsyncMock(return_value=None)
    svc = ProductService(repo)

    with pytest.raises(ProductNotFoundError) as exc_info:
        await svc.get_product_by_slug("nonexistent")
    assert "nonexistent" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_product_by_slug_uses_default_posts_limit():
    product = make_product(id=1, slug="notion")
    repo = AsyncMock()
    repo.get_product_by_slug = AsyncMock(return_value=product)
    repo.get_product_posts = AsyncMock(return_value=[])
    svc = ProductService(repo)

    await svc.get_product_by_slug("notion")
    repo.get_product_posts.assert_called_once_with(1, 10)


# ---------------------------------------------------------------------------
# ProductMetrics domain model
# ---------------------------------------------------------------------------


def test_product_metrics_stores_fields():
    metrics = ProductMetrics(total_mentions=100, negative_count=30, sentiment_score=70)
    assert metrics.total_mentions == 100
    assert metrics.negative_count == 30
    assert metrics.sentiment_score == 70


def test_product_metrics_is_frozen():
    """ProductMetrics is a frozen dataclass — mutation must raise."""
    metrics = ProductMetrics(total_mentions=10, negative_count=5, sentiment_score=50)
    with pytest.raises((AttributeError, TypeError)):
        metrics.total_mentions = 99  # type: ignore[misc]


def test_product_metrics_zero_values():
    metrics = ProductMetrics(total_mentions=0, negative_count=0, sentiment_score=0)
    assert metrics.total_mentions == 0
    assert metrics.negative_count == 0
    assert metrics.sentiment_score == 0


# ---------------------------------------------------------------------------
# Product domain model with tags
# ---------------------------------------------------------------------------


def test_product_with_tags_stores_tags():
    tags = [PostTag(slug="productivity", name="Productivity"), PostTag(slug="saas", name="SaaS")]
    product = make_product(tags=tags)
    assert len(product.tags) == 2
    assert product.tags[0].slug == "productivity"
    assert product.tags[1].name == "SaaS"


def test_product_default_tags_is_empty_list():
    """make_product with no tags arg returns a Product with empty tags."""
    product = make_product()
    assert product.tags == []


def test_product_is_frozen():
    """Product is a frozen dataclass — mutation must raise."""
    product = make_product()
    with pytest.raises((AttributeError, TypeError)):
        product.name = "Changed"  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Service: get_product_by_slug returns metrics from repo
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_product_by_slug_returns_metrics_from_repo():
    """Verify the returned metrics object is exactly what the repo provides."""
    product = make_product(id=7, slug="stripe")
    expected_metrics = ProductMetrics(total_mentions=50, negative_count=20, sentiment_score=40)
    repo = AsyncMock()
    repo.get_product_by_slug = AsyncMock(return_value=product)
    repo.get_product_posts = AsyncMock(return_value=[])
    repo.get_product_metrics = AsyncMock(return_value=expected_metrics)
    svc = ProductService(repo)

    _, _, metrics = await svc.get_product_by_slug("stripe")
    assert metrics is expected_metrics


@pytest.mark.asyncio
async def test_get_product_by_slug_with_tags_in_product():
    """Product returned by slug may have tags — they propagate through the tuple."""
    tags = [PostTag(slug="payments", name="Payments")]
    product = make_product(id=2, slug="stripe", tags=tags)
    metrics = ProductMetrics(total_mentions=10, negative_count=2, sentiment_score=80)
    repo = AsyncMock()
    repo.get_product_by_slug = AsyncMock(return_value=product)
    repo.get_product_posts = AsyncMock(return_value=[])
    repo.get_product_metrics = AsyncMock(return_value=metrics)
    svc = ProductService(repo)

    result_product, _, _ = await svc.get_product_by_slug("stripe")
    assert len(result_product.tags) == 1
    assert result_product.tags[0].slug == "payments"
