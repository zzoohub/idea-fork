from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from domain.rating.errors import DuplicateRatingError
from domain.rating.models import Rating
from tests.conftest import build_test_app, make_brief


@pytest.mark.asyncio
async def test_create_rating():
    brief = make_brief()
    rating = Rating(
        id=1,
        brief_id=1,
        is_positive=True,
        feedback=None,
        created_at=datetime(2026, 2, 21, 10, 30, tzinfo=timezone.utc),
    )
    brief_repo = AsyncMock()
    brief_repo.get_brief_by_id = AsyncMock(return_value=brief)
    rating_repo = AsyncMock()
    rating_repo.create_rating = AsyncMock(return_value=rating)

    app = build_test_app(brief_repo=brief_repo, rating_repo=rating_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/v1/briefs/1/ratings",
            json={"is_positive": True},
            cookies={"session_id": "test-session"},
        )

    assert resp.status_code == 201
    body = resp.json()
    assert body["data"]["is_positive"] is True
    assert resp.headers["cache-control"] == "private, no-store"


@pytest.mark.asyncio
async def test_create_rating_missing_session():
    app = build_test_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/v1/briefs/1/ratings",
            json={"is_positive": True},
        )

    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_rating_duplicate():
    brief = make_brief()
    brief_repo = AsyncMock()
    brief_repo.get_brief_by_id = AsyncMock(return_value=brief)
    rating_repo = AsyncMock()
    rating_repo.create_rating = AsyncMock(side_effect=DuplicateRatingError())

    app = build_test_app(brief_repo=brief_repo, rating_repo=rating_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/v1/briefs/1/ratings",
            json={"is_positive": True},
            cookies={"session_id": "test-session"},
        )

    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_create_rating_brief_not_found():
    app = build_test_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/v1/briefs/99999/ratings",
            json={"is_positive": True},
            cookies={"session_id": "test-session"},
        )

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_rating():
    brief = make_brief()
    rating = Rating(
        id=1,
        brief_id=1,
        is_positive=False,
        feedback="Too vague",
        created_at=datetime(2026, 2, 21, 10, 30, tzinfo=timezone.utc),
    )
    brief_repo = AsyncMock()
    brief_repo.get_brief_by_id = AsyncMock(return_value=brief)
    rating_repo = AsyncMock()
    rating_repo.update_rating = AsyncMock(return_value=rating)

    app = build_test_app(brief_repo=brief_repo, rating_repo=rating_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.patch(
            "/v1/briefs/1/ratings",
            json={"is_positive": False, "feedback": "Too vague"},
            cookies={"session_id": "test-session"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["is_positive"] is False
    assert body["data"]["feedback"] == "Too vague"


@pytest.mark.asyncio
async def test_update_rating_not_found():
    brief = make_brief()
    brief_repo = AsyncMock()
    brief_repo.get_brief_by_id = AsyncMock(return_value=brief)
    rating_repo = AsyncMock()
    rating_repo.update_rating = AsyncMock(return_value=None)

    app = build_test_app(brief_repo=brief_repo, rating_repo=rating_repo)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.patch(
            "/v1/briefs/1/ratings",
            json={"is_positive": True},
            cookies={"session_id": "test-session"},
        )

    assert resp.status_code == 404
