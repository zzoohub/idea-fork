from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from tests.conftest import build_test_app, make_brief


@pytest.mark.asyncio
async def test_list_briefs():
    brief_repo = AsyncMock()
    brief_repo.list_briefs = AsyncMock(return_value=[make_brief()])

    app = build_test_app(brief_repo=brief_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/briefs")

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 1
    assert body["data"][0]["slug"] == "test-brief"
    assert resp.headers["cache-control"] == "public, max-age=60"


@pytest.mark.asyncio
async def test_get_brief_by_slug():
    brief = make_brief()
    brief_repo = AsyncMock()
    brief_repo.get_brief_by_slug = AsyncMock(return_value=brief)

    app = build_test_app(brief_repo=brief_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/briefs/test-brief")

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["problem_statement"] == "Test problem"
    assert body["data"]["solution_directions"] == ["Direction 1", "Direction 2"]
    assert resp.headers["cache-control"] == "public, max-age=300"


@pytest.mark.asyncio
async def test_list_briefs_pagination_has_next():
    # Return limit+1 briefs to trigger has_next and next_cursor encoding
    briefs = [make_brief(id=i, slug=f"brief-{i}") for i in range(21)]
    brief_repo = AsyncMock()
    brief_repo.list_briefs = AsyncMock(return_value=briefs)

    app = build_test_app(brief_repo=brief_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/briefs", params={"limit": 20})

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 20
    assert body["meta"]["has_next"] is True
    assert body["meta"]["next_cursor"] is not None


@pytest.mark.asyncio
async def test_list_briefs_pagination_sort_upvote_count():
    briefs = [make_brief(id=i, slug=f"brief-{i}") for i in range(6)]
    brief_repo = AsyncMock()
    brief_repo.list_briefs = AsyncMock(return_value=briefs)

    app = build_test_app(brief_repo=brief_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/briefs", params={"limit": 5, "sort": "-upvote_count"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["has_next"] is True
    assert body["meta"]["next_cursor"] is not None


@pytest.mark.asyncio
async def test_list_briefs_pagination_sort_source_count():
    briefs = [make_brief(id=i, slug=f"brief-{i}") for i in range(6)]
    brief_repo = AsyncMock()
    brief_repo.list_briefs = AsyncMock(return_value=briefs)

    app = build_test_app(brief_repo=brief_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/briefs", params={"limit": 5, "sort": "-source_count"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["has_next"] is True
    assert body["meta"]["next_cursor"] is not None


@pytest.mark.asyncio
async def test_get_brief_not_found():
    app = build_test_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/briefs/nonexistent")

    assert resp.status_code == 404
