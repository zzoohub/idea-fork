"""Tests for inbound/http/admin/router.py and admin router registration in app/main.py."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from inbound.http.admin.router import router as admin_router


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_admin_app() -> FastAPI:
    """Build a minimal FastAPI app with the admin router registered."""
    app = FastAPI()
    app.include_router(admin_router)
    return app


def _make_mock_db():
    """Return a mock Database that yields a mock session."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_db = MagicMock()
    mock_db.session.return_value = mock_session
    mock_db.dispose = AsyncMock()
    return mock_db


def _create_app_with_debug(debug: bool) -> FastAPI:
    """Create the real app via create_app() with API_DEBUG set to the given value."""
    mock_db = _make_mock_db()

    with (
        patch("app.main.get_settings") as mock_settings,
        patch("app.main.Database", return_value=mock_db),
        patch("app.main.PostgresTagRepository"),
        patch("app.main.PostgresPostRepository"),
        patch("app.main.PostgresBriefRepository"),
        patch("app.main.PostgresProductRepository"),
        patch("app.main.PostgresRatingRepository"),
        patch("app.main.PostgresPipelineRepository"),
        patch("app.main.RedditApiClient"),
        patch("app.main.GeminiLlmClient"),
    ):
        settings = MagicMock()
        settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"
        settings.API_CORS_ALLOWED_ORIGINS = "http://localhost:3000"
        settings.API_DEBUG = debug
        settings.REDDIT_USER_AGENT = "test-agent"
        settings.GOOGLE_API_KEY = "test-key"
        settings.LLM_MODEL = "gemini-2.5-flash"
        settings.PIPELINE_SUBREDDITS = "startups,SaaS"
        settings.PIPELINE_FETCH_LIMIT = 100
        settings.API_INTERNAL_SECRET = "test-secret"
        mock_settings.return_value = settings

        from app.main import create_app

        return create_app()


# ---------------------------------------------------------------------------
# Admin router — direct unit tests (router mounted standalone)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pipeline_admin_page_returns_200():
    """GET /admin/pipeline must return HTTP 200."""
    app = _build_admin_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_pipeline_admin_page_content_type_is_html():
    """GET /admin/pipeline must return a text/html content-type."""
    app = _build_admin_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    assert "text/html" in resp.headers["content-type"]


@pytest.mark.asyncio
async def test_pipeline_admin_page_contains_title():
    """The response HTML must contain the page title 'Pipeline Admin'."""
    app = _build_admin_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    assert "Pipeline Admin" in resp.text


@pytest.mark.asyncio
async def test_pipeline_admin_page_contains_run_button():
    """The response HTML must include the 'Run Pipeline' button."""
    app = _build_admin_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    assert "Run Pipeline" in resp.text


@pytest.mark.asyncio
async def test_pipeline_admin_page_contains_secret_input():
    """The response HTML must include the secret input field."""
    app = _build_admin_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    assert "API_INTERNAL_SECRET" in resp.text


@pytest.mark.asyncio
async def test_pipeline_admin_page_contains_form_elements():
    """The response HTML must include the password input and the result container."""
    app = _build_admin_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    html = resp.text
    assert 'type="password"' in html
    assert 'id="result"' in html


@pytest.mark.asyncio
async def test_pipeline_admin_page_is_valid_html_document():
    """The response must be a full HTML document with doctype, head, and body."""
    app = _build_admin_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    html = resp.text
    assert "<!DOCTYPE html>" in html
    assert "<html" in html
    assert "<head>" in html
    assert "<body>" in html
    assert "</html>" in html


@pytest.mark.asyncio
async def test_pipeline_admin_page_references_pipeline_run_endpoint():
    """The page JavaScript must reference the /internal/pipeline/run fetch call."""
    app = _build_admin_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    assert "/internal/pipeline/run" in resp.text


# ---------------------------------------------------------------------------
# Admin router registration — integration with create_app()
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_pipeline_route_accessible_when_debug_true():
    """GET /admin/pipeline returns 200 when API_DEBUG=True."""
    app = _create_app_with_debug(debug=True)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_pipeline_route_returns_html_when_debug_true():
    """GET /admin/pipeline returns HTML content when API_DEBUG=True."""
    app = _create_app_with_debug(debug=True)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    assert "text/html" in resp.headers["content-type"]
    assert "Pipeline Admin" in resp.text


@pytest.mark.asyncio
async def test_admin_pipeline_route_returns_404_when_debug_false():
    """GET /admin/pipeline returns 404 when API_DEBUG=False (router not registered)."""
    app = _create_app_with_debug(debug=False)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_admin_prefix_root_returns_404_when_debug_false():
    """GET /admin returns 404 when API_DEBUG=False (no admin routes registered)."""
    app = _create_app_with_debug(debug=False)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin")

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_admin_pipeline_html_contains_title_when_debug_true():
    """The HTML page returned via the full app (debug=True) contains 'Pipeline Admin'."""
    app = _create_app_with_debug(debug=True)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    assert "Pipeline Admin" in resp.text


@pytest.mark.asyncio
async def test_admin_pipeline_html_contains_run_button_when_debug_true():
    """The HTML returned via the full app (debug=True) contains the Run Pipeline button."""
    app = _create_app_with_debug(debug=True)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/pipeline")

    assert "Run Pipeline" in resp.text


# ---------------------------------------------------------------------------
# Router metadata
# ---------------------------------------------------------------------------

def test_admin_router_prefix():
    """The admin router must be mounted at the /admin prefix."""
    assert admin_router.prefix == "/admin"


def test_admin_router_tags():
    """The admin router must carry the 'admin' tag."""
    assert "admin" in admin_router.tags


def test_admin_router_has_pipeline_route():
    """The admin router must expose a GET /admin/pipeline route."""
    routes = {route.path for route in admin_router.routes}
    assert "/admin/pipeline" in routes
