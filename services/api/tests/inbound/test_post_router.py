from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from tests.conftest import build_test_app, make_post


@pytest.mark.asyncio
async def test_list_posts_returns_envelope():
    post_repo = AsyncMock()
    post_repo.list_posts = AsyncMock(return_value=[make_post(1), make_post(2)])

    app = build_test_app(post_repo=post_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/posts")

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 2
    assert body["meta"]["has_next"] is False
    assert resp.headers["cache-control"] == "public, max-age=60"


@pytest.mark.asyncio
async def test_list_posts_pagination():
    # Return limit+1 posts to trigger has_next
    posts = [make_post(i) for i in range(21)]
    post_repo = AsyncMock()
    post_repo.list_posts = AsyncMock(return_value=posts)

    app = build_test_app(post_repo=post_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/posts", params={"limit": 20})

    body = resp.json()
    assert len(body["data"]) == 20
    assert body["meta"]["has_next"] is True
    assert body["meta"]["next_cursor"] is not None


@pytest.mark.asyncio
async def test_get_post_found():
    post = make_post(42)
    post_repo = AsyncMock()
    post_repo.get_post = AsyncMock(return_value=post)

    app = build_test_app(post_repo=post_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/posts/42")

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["id"] == 42
    assert resp.headers["cache-control"] == "public, max-age=300"


@pytest.mark.asyncio
async def test_get_post_not_found():
    app = build_test_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/posts/99999")

    assert resp.status_code == 404
