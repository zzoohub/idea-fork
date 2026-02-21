from unittest.mock import AsyncMock

import pytest

from domain.product.errors import ProductNotFoundError
from domain.product.models import ProductListParams
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
    repo = AsyncMock()
    repo.get_product_by_slug = AsyncMock(return_value=product)
    repo.get_product_posts = AsyncMock(return_value=posts)
    svc = ProductService(repo)

    result_product, result_posts = await svc.get_product_by_slug("notion", posts_limit=5)
    assert result_product.slug == "notion"
    assert len(result_posts) == 2
    repo.get_product_by_slug.assert_called_once_with("notion")
    repo.get_product_posts.assert_called_once_with(10, 5)


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
