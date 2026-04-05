"""Additional tests for app/main.py — covering the unhandled-exception handler (line 96)."""
import pytest
from httpx import ASGITransport, AsyncClient

from tests.test_app_main import _make_mock_db, _patch_create_app


@pytest.mark.asyncio
async def test_unhandled_exception_handler_returns_500():
    """The generic Exception handler must return 500 with the problem+json body."""
    mock_db = _make_mock_db()

    with _patch_create_app(mock_db):
        from app.main import create_app

        app = create_app()

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
