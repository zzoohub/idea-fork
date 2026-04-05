"""Tests for src/app/main.py — create_app(), _rate_limit_key(), lifespan, rate-limit handler."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from starlette.requests import Request


# ---------------------------------------------------------------------------
# _rate_limit_key
# ---------------------------------------------------------------------------

def test_rate_limit_key_uses_session_id():
    from inbound.http.limiter import _rate_limit_key

    request = MagicMock(spec=Request)
    request.cookies = {"session_id": "abc123"}
    key = _rate_limit_key(request)
    assert key == "abc123"


def test_rate_limit_key_falls_back_to_ip():
    from inbound.http.limiter import _rate_limit_key

    request = MagicMock(spec=Request)
    request.cookies = {}
    request.client = MagicMock()
    request.client.host = "1.2.3.4"
    with patch("inbound.http.limiter.get_remote_address", return_value="1.2.3.4"):
        key = _rate_limit_key(request)
    assert key == "1.2.3.4"


# ---------------------------------------------------------------------------
# create_app integration — uses mocked postgres layer so no real DB needed
# ---------------------------------------------------------------------------

def _make_mock_db():
    """Return a mock Database that yields a mock session."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_db = MagicMock()
    mock_db.session.return_value = mock_session
    mock_db.dispose = AsyncMock()
    return mock_db


def _make_mock_settings(**overrides) -> MagicMock:
    """Build a mock Settings with all required attributes for create_app().

    Prevents MagicMock auto-attributes from being truthy where a real
    empty-string default is expected (e.g. SENTRY_DSN, GOOGLE_API_KEY).
    """
    settings = MagicMock()
    defaults = {
        "API_DATABASE_URL": "postgresql+asyncpg://localhost/test",
        "API_CORS_ALLOWED_ORIGINS": "http://localhost:3000",
        "API_DEBUG": False,
        "API_INTERNAL_SECRET": "",
        "SENTRY_DSN": "",
        "SENTRY_ENVIRONMENT": "test",
        "REDDIT_USER_AGENT": "test/0.1",
        "GOOGLE_API_KEY": "",
        "LLM_MODEL": "gemini-2.5-flash",
        "LLM_LITE_MODEL": "gemini-2.5-flash-lite",
        "LLM_BRIEF_TEMPERATURE": 0.9,
        "PIPELINE_SUBREDDITS": "test",
        "PIPELINE_FETCH_LIMIT": 5,
        "PIPELINE_RSS_FEEDS": "",
        "PIPELINE_APPSTORE_KEYWORDS": "",
        "PIPELINE_APPSTORE_REVIEW_PAGES": 1,
        "PIPELINE_PLAYSTORE_REVIEW_COUNT": 30,
        "PIPELINE_APPSTORE_MAX_AGE_DAYS": 365,
        "PRODUCTHUNT_API_TOKEN": "",
    }
    defaults.update(overrides)
    for key, value in defaults.items():
        setattr(settings, key, value)
    return settings


import contextlib


@contextlib.contextmanager
def _patch_create_app(mock_db, **settings_overrides):
    """Patch all external dependencies of create_app() in one place."""
    with (
        patch("app.main.get_settings") as mock_get_settings,
        patch("app.main.Database", return_value=mock_db),
        patch("app.main.PostgresTagRepository"),
        patch("app.main.PostgresPostRepository"),
        patch("app.main.PostgresBriefRepository"),
        patch("app.main.PostgresProductRepository"),
        patch("app.main.PostgresRatingRepository"),
        patch("app.main.PostgresPipelineRepository"),
        patch("app.main.RedditApiClient"),
        patch("app.main.GeminiLlmClient"),
        patch("app.main.RssFeedClient"),
        patch("app.main.GoogleTrendsClient"),
        patch("app.main.ProductHuntApiClient"),
    ):
        mock_get_settings.return_value = _make_mock_settings(**settings_overrides)
        yield


@pytest.mark.asyncio
async def test_create_app_health_endpoint():
    mock_db = _make_mock_db()

    with _patch_create_app(mock_db):
        from app.main import create_app

        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/health")

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_create_app_docs_disabled_by_default():
    mock_db = _make_mock_db()

    with _patch_create_app(mock_db, API_DEBUG=False):
        from app.main import create_app

        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/docs")

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_app_docs_enabled_in_debug():
    mock_db = _make_mock_db()

    with _patch_create_app(mock_db, API_DEBUG=True):
        from app.main import create_app

        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/docs")

    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_app_multiple_cors_origins():
    mock_db = _make_mock_db()

    with _patch_create_app(
        mock_db,
        API_CORS_ALLOWED_ORIGINS="http://localhost:3000, https://idea-fork.com",
    ):
        from app.main import create_app

        app = create_app()

    assert isinstance(app, FastAPI)


@pytest.mark.asyncio
async def test_create_app_lifespan_disposes_db():
    """The lifespan shutdown path calls db.dispose() after yielding."""
    mock_db = _make_mock_db()

    with _patch_create_app(mock_db):
        from app.main import create_app

        app = create_app()
        async with app.router.lifespan_context(app):
            pass

    mock_db.dispose.assert_called_once()


@pytest.mark.asyncio
async def test_rate_limit_handler_returns_429():
    """Test that the rate limit exception handler returns the correct 429 response."""
    mock_db = _make_mock_db()

    with _patch_create_app(mock_db):
        from app.main import create_app
        from slowapi.errors import RateLimitExceeded

        app = create_app()

        mock_limit = MagicMock()
        mock_limit.error_message = None
        mock_limit.limit = MagicMock()
        mock_limit.limit.__str__ = MagicMock(return_value="1 per minute")

        @app.get("/test-rate-limit")
        async def _trigger_rate_limit():
            exc = RateLimitExceeded(mock_limit)
            exc.retry_after = 30
            raise exc

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/test-rate-limit")

    assert resp.status_code == 429
    body = resp.json()
    assert body["status"] == 429
    assert body["title"] == "Too Many Requests"
    assert "Retry-After" in resp.headers


@pytest.mark.asyncio
async def test_rate_limit_handler_retry_after_default():
    """Test rate limit handler uses default retry_after=60 when not set on exception."""
    mock_db = _make_mock_db()

    with _patch_create_app(mock_db):
        from app.main import create_app
        from slowapi.errors import RateLimitExceeded

        app = create_app()

        mock_limit = MagicMock()
        mock_limit.error_message = None
        mock_limit.limit = MagicMock()
        mock_limit.limit.__str__ = MagicMock(return_value="1 per minute")

        @app.get("/test-rate-limit-default")
        async def _trigger_rate_limit_default():
            exc = RateLimitExceeded(mock_limit)
            if hasattr(exc, "retry_after"):
                del exc.retry_after
            raise exc

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/test-rate-limit-default")

    assert resp.status_code == 429
    assert resp.headers["Retry-After"] == "60"
