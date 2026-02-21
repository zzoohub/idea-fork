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
    # get_remote_address uses request.client.host
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


@pytest.mark.asyncio
async def test_create_app_health_endpoint():
    mock_db = _make_mock_db()

    with (
        patch("app.main.get_settings") as mock_settings,
        patch("app.main.Database", return_value=mock_db),
        patch("app.main.PostgresTagRepository"),
        patch("app.main.PostgresPostRepository"),
        patch("app.main.PostgresBriefRepository"),
        patch("app.main.PostgresProductRepository"),
        patch("app.main.PostgresRatingRepository"),
    ):
        settings = MagicMock()
        settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"
        settings.API_CORS_ALLOWED_ORIGINS = "http://localhost:3000"
        settings.API_DEBUG = False
        mock_settings.return_value = settings

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

    with (
        patch("app.main.get_settings") as mock_settings,
        patch("app.main.Database", return_value=mock_db),
        patch("app.main.PostgresTagRepository"),
        patch("app.main.PostgresPostRepository"),
        patch("app.main.PostgresBriefRepository"),
        patch("app.main.PostgresProductRepository"),
        patch("app.main.PostgresRatingRepository"),
    ):
        settings = MagicMock()
        settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"
        settings.API_CORS_ALLOWED_ORIGINS = "http://localhost:3000"
        settings.API_DEBUG = False
        mock_settings.return_value = settings

        from app.main import create_app

        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/docs")

    # Docs should be disabled (404) when API_DEBUG=False
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_app_docs_enabled_in_debug():
    mock_db = _make_mock_db()

    with (
        patch("app.main.get_settings") as mock_settings,
        patch("app.main.Database", return_value=mock_db),
        patch("app.main.PostgresTagRepository"),
        patch("app.main.PostgresPostRepository"),
        patch("app.main.PostgresBriefRepository"),
        patch("app.main.PostgresProductRepository"),
        patch("app.main.PostgresRatingRepository"),
    ):
        settings = MagicMock()
        settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"
        settings.API_CORS_ALLOWED_ORIGINS = "http://localhost:3000"
        settings.API_DEBUG = True
        mock_settings.return_value = settings

        from app.main import create_app

        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/docs")

    # Docs should be available when API_DEBUG=True
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_app_multiple_cors_origins():
    mock_db = _make_mock_db()

    with (
        patch("app.main.get_settings") as mock_settings,
        patch("app.main.Database", return_value=mock_db),
        patch("app.main.PostgresTagRepository"),
        patch("app.main.PostgresPostRepository"),
        patch("app.main.PostgresBriefRepository"),
        patch("app.main.PostgresProductRepository"),
        patch("app.main.PostgresRatingRepository"),
    ):
        settings = MagicMock()
        settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"
        settings.API_CORS_ALLOWED_ORIGINS = "http://localhost:3000, https://idea-fork.com"
        settings.API_DEBUG = False
        mock_settings.return_value = settings

        from app.main import create_app

        app = create_app()

    # App should have been created without error with multiple origins
    assert isinstance(app, FastAPI)


@pytest.mark.asyncio
async def test_create_app_lifespan_disposes_db():
    """The lifespan shutdown path calls db.dispose() after yielding."""
    mock_db = _make_mock_db()

    with (
        patch("app.main.get_settings") as mock_settings,
        patch("app.main.Database", return_value=mock_db),
        patch("app.main.PostgresTagRepository"),
        patch("app.main.PostgresPostRepository"),
        patch("app.main.PostgresBriefRepository"),
        patch("app.main.PostgresProductRepository"),
        patch("app.main.PostgresRatingRepository"),
    ):
        settings = MagicMock()
        settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"
        settings.API_CORS_ALLOWED_ORIGINS = "http://localhost:3000"
        settings.API_DEBUG = False
        mock_settings.return_value = settings

        from app.main import create_app

        app = create_app()
        # Directly exercise the lifespan by entering and exiting its context manager
        async with app.router.lifespan_context(app):
            pass  # startup finished, now exit triggers shutdown (dispose)

    mock_db.dispose.assert_called_once()


@pytest.mark.asyncio
async def test_rate_limit_handler_returns_429():
    """Test that the rate limit exception handler returns the correct 429 response."""
    mock_db = _make_mock_db()

    with (
        patch("app.main.get_settings") as mock_settings,
        patch("app.main.Database", return_value=mock_db),
        patch("app.main.PostgresTagRepository"),
        patch("app.main.PostgresPostRepository"),
        patch("app.main.PostgresBriefRepository"),
        patch("app.main.PostgresProductRepository"),
        patch("app.main.PostgresRatingRepository"),
    ):
        settings = MagicMock()
        settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"
        settings.API_CORS_ALLOWED_ORIGINS = "http://localhost:3000"
        settings.API_DEBUG = False
        mock_settings.return_value = settings

        from app.main import create_app
        from slowapi.errors import RateLimitExceeded

        app = create_app()

        # Create a mock Limit object that RateLimitExceeded expects
        mock_limit = MagicMock()
        mock_limit.error_message = None
        mock_limit.limit = MagicMock()
        mock_limit.limit.__str__ = MagicMock(return_value="1 per minute")

        # Add a test route that raises RateLimitExceeded with a valid mock limit
        @app.get("/test-rate-limit")
        async def _trigger_rate_limit():
            exc = RateLimitExceeded(mock_limit)
            exc.retry_after = 30  # set the retry_after attribute
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

    with (
        patch("app.main.get_settings") as mock_settings,
        patch("app.main.Database", return_value=mock_db),
        patch("app.main.PostgresTagRepository"),
        patch("app.main.PostgresPostRepository"),
        patch("app.main.PostgresBriefRepository"),
        patch("app.main.PostgresProductRepository"),
        patch("app.main.PostgresRatingRepository"),
    ):
        settings = MagicMock()
        settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"
        settings.API_CORS_ALLOWED_ORIGINS = "http://localhost:3000"
        settings.API_DEBUG = False
        mock_settings.return_value = settings

        from app.main import create_app
        from slowapi.errors import RateLimitExceeded

        app = create_app()

        mock_limit = MagicMock()
        mock_limit.error_message = None
        mock_limit.limit = MagicMock()
        mock_limit.limit.__str__ = MagicMock(return_value="1 per minute")

        @app.get("/test-rate-limit-default")
        async def _trigger_rate_limit_default():
            # Don't set retry_after, so handler uses getattr default of 60
            exc = RateLimitExceeded(mock_limit)
            # Explicitly remove retry_after if it exists
            if hasattr(exc, "retry_after"):
                del exc.retry_after
            raise exc

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/test-rate-limit-default")

    assert resp.status_code == 429
    assert resp.headers["Retry-After"] == "60"
