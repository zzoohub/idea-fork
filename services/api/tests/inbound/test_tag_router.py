from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from tests.conftest import build_test_app, make_tag


@pytest.mark.asyncio
async def test_list_tags_returns_data():
    tag_repo = AsyncMock()
    tag_repo.list_tags = AsyncMock(return_value=[make_tag(1, "saas", "SaaS"), make_tag(2, "mobile", "Mobile")])

    app = build_test_app(tag_repo=tag_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/tags")

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 2
    assert body["data"][0]["slug"] == "saas"
    assert body["data"][1]["slug"] == "mobile"


@pytest.mark.asyncio
async def test_list_tags_empty():
    tag_repo = AsyncMock()
    tag_repo.list_tags = AsyncMock(return_value=[])

    app = build_test_app(tag_repo=tag_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/tags")

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"] == []


@pytest.mark.asyncio
async def test_list_tags_has_cache_header():
    app = build_test_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/tags")

    assert resp.headers["cache-control"] == "public, max-age=3600"


@pytest.mark.asyncio
async def test_list_trending_tags_returns_data():
    tag_repo = AsyncMock()
    tag_repo.list_tags = AsyncMock(return_value=[])
    tag_repo.list_trending_tags = AsyncMock(
        return_value=[make_tag(1, "complaint", "Complaint"), make_tag(2, "saas", "SaaS")]
    )

    app = build_test_app(tag_repo=tag_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/tags/trending")

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 2
    assert body["data"][0]["slug"] == "complaint"


@pytest.mark.asyncio
async def test_list_trending_tags_with_params():
    tag_repo = AsyncMock()
    tag_repo.list_tags = AsyncMock(return_value=[])
    tag_repo.list_trending_tags = AsyncMock(return_value=[make_tag(1, "saas", "SaaS")])

    app = build_test_app(tag_repo=tag_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/tags/trending?days=30&limit=5")

    assert resp.status_code == 200
    tag_repo.list_trending_tags.assert_called_once_with(30, 5)


@pytest.mark.asyncio
async def test_list_trending_tags_has_cache_header():
    tag_repo = AsyncMock()
    tag_repo.list_tags = AsyncMock(return_value=[])
    tag_repo.list_trending_tags = AsyncMock(return_value=[])

    app = build_test_app(tag_repo=tag_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/tags/trending")

    assert resp.headers["cache-control"] == "public, max-age=60"


@pytest.mark.asyncio
async def test_list_trending_tags_empty():
    tag_repo = AsyncMock()
    tag_repo.list_tags = AsyncMock(return_value=[])
    tag_repo.list_trending_tags = AsyncMock(return_value=[])

    app = build_test_app(tag_repo=tag_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/tags/trending")

    assert resp.status_code == 200
    assert resp.json()["data"] == []
