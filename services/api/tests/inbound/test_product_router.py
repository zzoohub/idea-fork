from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

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
