import pytest
from httpx import ASGITransport, AsyncClient

from tests.conftest import build_test_app, make_post


@pytest.mark.asyncio
async def test_not_found_returns_rfc9457():
    app = build_test_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/posts/99999")
    assert resp.status_code == 404
    body = resp.json()
    assert body["type"] == "https://api.idea-fork.com/errors/not-found"
    assert body["status"] == 404
    assert body["title"] == "Not Found"
    assert resp.headers["content-type"] == "application/problem+json"


@pytest.mark.asyncio
async def test_validation_error_returns_422():
    app = build_test_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/posts", params={"limit": 0})
    assert resp.status_code == 422
    body = resp.json()
    assert body["type"] == "https://api.idea-fork.com/errors/validation-failed"
    assert "errors" in body
