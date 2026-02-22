"""Additional tests for app/main.py — covering the unhandled-exception handler (line 96)."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient


def _make_mock_db():
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_db = MagicMock()
    mock_db.session.return_value = mock_session
    mock_db.dispose = AsyncMock()
    return mock_db


@pytest.mark.asyncio
async def test_unhandled_exception_handler_returns_500():
    """The generic Exception handler must return 500 with the problem+json body."""
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

        # Add a route that raises a bare Exception (not a known app exception)
        @app.get("/test-unhandled")
        async def _trigger_unhandled():
            raise RuntimeError("something went wrong")

        transport = ASGITransport(app=app, raise_app_exceptions=False)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/test-unhandled")

    assert resp.status_code == 500
    body = resp.json()
    assert body["status"] == 500
    assert body["title"] == "Internal Server Error"
    assert "application/problem+json" in resp.headers.get("content-type", "")
