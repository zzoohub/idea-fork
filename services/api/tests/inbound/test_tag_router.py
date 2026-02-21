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
