"""Tests for inbound/http/pipeline/router.py — pipeline endpoints."""
from dataclasses import asdict
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from domain.pipeline.models import PipelineRunResult
from inbound.http.pipeline.router import router as pipeline_router


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_pipeline_result(
    posts_fetched: int = 10,
    posts_upserted: int = 8,
    posts_tagged: int = 6,
    clusters_created: int = 2,
    briefs_generated: int = 2,
    errors: list[str] | None = None,
) -> PipelineRunResult:
    result = PipelineRunResult(
        posts_fetched=posts_fetched,
        posts_upserted=posts_upserted,
        posts_tagged=posts_tagged,
        clusters_created=clusters_created,
        briefs_generated=briefs_generated,
        errors=errors if errors is not None else [],
    )
    return result


def _build_pipeline_app(pipeline_service: AsyncMock, secret: str = "test-secret") -> FastAPI:
    """Build a minimal FastAPI app with the pipeline router and injected services."""
    app = FastAPI()

    @app.middleware("http")
    async def inject_services(request, call_next):
        request.state.pipeline_service = pipeline_service
        return await call_next(request)

    app.include_router(pipeline_router, prefix="/internal")
    return app


# ---------------------------------------------------------------------------
# Authentication / guard tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_pipeline_returns_403_when_no_secret_header():
    """Should return 403 when the X-Internal-Secret header is absent."""
    mock_service = AsyncMock()
    app = _build_pipeline_app(mock_service)

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        settings = _mock_settings(secret="my-secret")
        mock_get_settings.return_value = settings

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/internal/pipeline/run")

    assert resp.status_code == 403
    body = resp.json()
    assert body["status"] == 403
    assert body["title"] == "Forbidden"
    assert "Invalid or missing internal secret" in body["detail"]
    assert body["type"] == "https://api.idea-fork.com/errors/forbidden"
    assert resp.headers["content-type"] == "application/problem+json"
    mock_service.run.assert_not_called()


@pytest.mark.asyncio
async def test_run_pipeline_returns_403_when_wrong_secret():
    """Should return 403 when the X-Internal-Secret header has the wrong value."""
    mock_service = AsyncMock()
    app = _build_pipeline_app(mock_service)

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        settings = _mock_settings(secret="correct-secret")
        mock_get_settings.return_value = settings

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/internal/pipeline/run",
                headers={"x-internal-secret": "wrong-secret"},
            )

    assert resp.status_code == 403
    body = resp.json()
    assert body["status"] == 403
    assert body["title"] == "Forbidden"
    mock_service.run.assert_not_called()


@pytest.mark.asyncio
async def test_run_pipeline_returns_403_when_secret_is_empty_string():
    """Should return 403 when API_INTERNAL_SECRET is empty (endpoint disabled)."""
    mock_service = AsyncMock()
    app = _build_pipeline_app(mock_service)

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        # Even if caller sends the correct empty string, it should still be 403
        settings = _mock_settings(secret="")
        mock_get_settings.return_value = settings

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/internal/pipeline/run",
                headers={"x-internal-secret": ""},
            )

    assert resp.status_code == 403
    body = resp.json()
    assert body["status"] == 403
    mock_service.run.assert_not_called()


@pytest.mark.asyncio
async def test_run_pipeline_returns_403_when_secret_empty_and_no_header():
    """Should return 403 when API_INTERNAL_SECRET is empty and no header is sent."""
    mock_service = AsyncMock()
    app = _build_pipeline_app(mock_service)

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        settings = _mock_settings(secret="")
        mock_get_settings.return_value = settings

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/internal/pipeline/run")

    assert resp.status_code == 403
    mock_service.run.assert_not_called()


# ---------------------------------------------------------------------------
# Success path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_pipeline_returns_200_on_success():
    """Should return 200 when the correct secret is provided and pipeline has no errors."""
    result = _make_pipeline_result()
    mock_service = AsyncMock()
    mock_service.run = AsyncMock(return_value=result)

    app = _build_pipeline_app(mock_service, secret="my-secret")

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        settings = _mock_settings(secret="my-secret")
        mock_get_settings.return_value = settings

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/internal/pipeline/run",
                headers={"x-internal-secret": "my-secret"},
            )

    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert body["data"]["posts_fetched"] == 10
    assert body["data"]["posts_upserted"] == 8
    assert body["data"]["posts_tagged"] == 6
    assert body["data"]["clusters_created"] == 2
    assert body["data"]["briefs_generated"] == 2
    assert body["data"]["errors"] == []
    mock_service.run.assert_awaited_once()


@pytest.mark.asyncio
async def test_run_pipeline_response_data_matches_asdict():
    """The response body data must exactly match asdict(result)."""
    result = _make_pipeline_result(
        posts_fetched=5,
        posts_upserted=4,
        posts_tagged=3,
        clusters_created=1,
        briefs_generated=1,
        errors=[],
    )
    mock_service = AsyncMock()
    mock_service.run = AsyncMock(return_value=result)

    app = _build_pipeline_app(mock_service)

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        settings = _mock_settings(secret="secret-xyz")
        mock_get_settings.return_value = settings

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/internal/pipeline/run",
                headers={"x-internal-secret": "secret-xyz"},
            )

    assert resp.status_code == 200
    assert resp.json()["data"] == asdict(result)


# ---------------------------------------------------------------------------
# Partial success (207 Multi-Status)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_pipeline_returns_207_when_pipeline_has_errors():
    """Should return 207 when the pipeline completes but reports errors."""
    result = _make_pipeline_result(
        posts_fetched=10,
        errors=["Fetch stage failed", "Tag batch failed (5 posts)"],
    )
    mock_service = AsyncMock()
    mock_service.run = AsyncMock(return_value=result)

    app = _build_pipeline_app(mock_service)

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        settings = _mock_settings(secret="my-secret")
        mock_get_settings.return_value = settings

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/internal/pipeline/run",
                headers={"x-internal-secret": "my-secret"},
            )

    assert resp.status_code == 207
    body = resp.json()
    assert "data" in body
    assert body["data"]["errors"] == ["Fetch stage failed", "Tag batch failed (5 posts)"]
    mock_service.run.assert_awaited_once()


@pytest.mark.asyncio
async def test_run_pipeline_207_with_single_error():
    """Should return 207 when the pipeline has exactly one error."""
    result = _make_pipeline_result(errors=["Brief generation failed for cluster 1"])
    mock_service = AsyncMock()
    mock_service.run = AsyncMock(return_value=result)

    app = _build_pipeline_app(mock_service)

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        settings = _mock_settings(secret="tok")
        mock_get_settings.return_value = settings

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/internal/pipeline/run",
                headers={"x-internal-secret": "tok"},
            )

    assert resp.status_code == 207


# ---------------------------------------------------------------------------
# Pipeline service is called
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pipeline_service_run_is_awaited():
    """The pipeline service's run() method must be called exactly once per request."""
    result = _make_pipeline_result()
    mock_service = AsyncMock()
    mock_service.run = AsyncMock(return_value=result)

    app = _build_pipeline_app(mock_service)

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        settings = _mock_settings(secret="s3cr3t")
        mock_get_settings.return_value = settings

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post(
                "/internal/pipeline/run",
                headers={"x-internal-secret": "s3cr3t"},
            )

    mock_service.run.assert_awaited_once()


@pytest.mark.asyncio
async def test_pipeline_service_retrieved_from_request_state():
    """_get_service() reads pipeline_service from request.state — verify via injection."""
    result = _make_pipeline_result()
    mock_service = AsyncMock()
    mock_service.run = AsyncMock(return_value=result)

    # Build app that injects a second mock as pipeline_service to confirm isolation
    different_mock = AsyncMock()
    different_mock.run = AsyncMock(return_value=_make_pipeline_result(posts_fetched=99))

    app = FastAPI()

    @app.middleware("http")
    async def inject(request, call_next):
        request.state.pipeline_service = different_mock
        return await call_next(request)

    app.include_router(pipeline_router, prefix="/internal")

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        settings = _mock_settings(secret="abc")
        mock_get_settings.return_value = settings

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/internal/pipeline/run",
                headers={"x-internal-secret": "abc"},
            )

    assert resp.status_code == 200
    assert resp.json()["data"]["posts_fetched"] == 99
    different_mock.run.assert_awaited_once()
    mock_service.run.assert_not_called()


# ---------------------------------------------------------------------------
# Logging (smoke-test the logger.info path)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_pipeline_logs_completion(caplog):
    """Logger.info must be called after a successful pipeline run."""
    import logging

    result = _make_pipeline_result(
        posts_fetched=3,
        posts_upserted=3,
        posts_tagged=3,
        clusters_created=1,
        briefs_generated=1,
        errors=[],
    )
    mock_service = AsyncMock()
    mock_service.run = AsyncMock(return_value=result)

    app = _build_pipeline_app(mock_service)

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        settings = _mock_settings(secret="log-test")
        mock_get_settings.return_value = settings

        with caplog.at_level(logging.INFO, logger="inbound.http.pipeline.router"):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                await client.post(
                    "/internal/pipeline/run",
                    headers={"x-internal-secret": "log-test"},
                )

    assert any("Pipeline run complete" in record.message for record in caplog.records)


# ---------------------------------------------------------------------------
# _get_service helper (unit-level)
# ---------------------------------------------------------------------------

def test_get_service_returns_pipeline_service_from_request_state():
    """_get_service() should return whatever is stored in request.state.pipeline_service."""
    from unittest.mock import MagicMock

    from inbound.http.pipeline.router import _get_service

    mock_request = MagicMock()
    sentinel = object()
    mock_request.state.pipeline_service = sentinel

    result = _get_service(mock_request)
    assert result is sentinel


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _mock_settings(secret: str):
    """Return a simple namespace-like object representing Settings."""
    from unittest.mock import MagicMock

    settings = MagicMock()
    settings.API_INTERNAL_SECRET = secret
    return settings


# ---------------------------------------------------------------------------
# GET /internal/pipeline/status
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_pipeline_status_returns_running_true():
    mock_service = AsyncMock()
    mock_service.is_running = AsyncMock(return_value=True)
    app = _build_pipeline_app(mock_service)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/internal/pipeline/status")

    assert resp.status_code == 200
    body = resp.json()
    assert body == {"data": {"is_running": True}}
    mock_service.is_running.assert_awaited_once()


@pytest.mark.asyncio
async def test_pipeline_status_returns_running_false():
    mock_service = AsyncMock()
    mock_service.is_running = AsyncMock(return_value=False)
    app = _build_pipeline_app(mock_service)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/internal/pipeline/status")

    assert resp.status_code == 200
    body = resp.json()
    assert body == {"data": {"is_running": False}}


# ---------------------------------------------------------------------------
# GET /internal/pipeline/pending
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_pipeline_pending_returns_counts():
    mock_service = AsyncMock()
    mock_service.get_pending_counts = AsyncMock(
        return_value={"pending_tag": 10, "pending_cluster": 5, "pending_brief": 2}
    )
    app = _build_pipeline_app(mock_service)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/internal/pipeline/pending")

    assert resp.status_code == 200
    body = resp.json()
    assert body == {"data": {"pending_tag": 10, "pending_cluster": 5, "pending_brief": 2}}
    mock_service.get_pending_counts.assert_awaited_once()


@pytest.mark.asyncio
async def test_pipeline_pending_returns_zeros():
    mock_service = AsyncMock()
    mock_service.get_pending_counts = AsyncMock(
        return_value={"pending_tag": 0, "pending_cluster": 0, "pending_brief": 0}
    )
    app = _build_pipeline_app(mock_service)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/internal/pipeline/pending")

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["pending_tag"] == 0
    assert body["data"]["pending_cluster"] == 0
    assert body["data"]["pending_brief"] == 0


# ---------------------------------------------------------------------------
# POST /internal/pipeline/run?skip_fetch=true
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_run_pipeline_with_skip_fetch_passes_param():
    """skip_fetch=true query param should be passed to svc.run(skip_fetch=True)."""
    result = _make_pipeline_result()
    mock_service = AsyncMock()
    mock_service.run = AsyncMock(return_value=result)

    app = _build_pipeline_app(mock_service)

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        settings = _mock_settings(secret="my-secret")
        mock_get_settings.return_value = settings

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/internal/pipeline/run?skip_fetch=true",
                headers={"x-internal-secret": "my-secret"},
            )

    assert resp.status_code == 200
    mock_service.run.assert_awaited_once_with(skip_fetch=True)


@pytest.mark.asyncio
async def test_run_pipeline_without_skip_fetch_defaults_false():
    """Without skip_fetch param, svc.run should be called with skip_fetch=False."""
    result = _make_pipeline_result()
    mock_service = AsyncMock()
    mock_service.run = AsyncMock(return_value=result)

    app = _build_pipeline_app(mock_service)

    with patch(
        "inbound.http.pipeline.router.get_settings"
    ) as mock_get_settings:
        settings = _mock_settings(secret="my-secret")
        mock_get_settings.return_value = settings

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/internal/pipeline/run",
                headers={"x-internal-secret": "my-secret"},
            )

    assert resp.status_code == 200
    mock_service.run.assert_awaited_once_with(skip_fetch=False)
