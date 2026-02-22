"""Tests for inbound/http/dependencies.py — get_session_id edge cases."""
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from inbound.http.dependencies import _SESSION_ID_MAX_LEN, get_session_id
from inbound.http.errors import register_exception_handlers


def _make_session_app():
    """Tiny FastAPI app that exposes get_session_id as a dependency."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/session")
    async def read_session(session_id: str = pytest.importorskip("fastapi").Depends(get_session_id)):
        return {"session_id": session_id}

    return app


@pytest.mark.asyncio
async def test_get_session_id_too_long_raises_bad_request():
    """A session_id cookie longer than 255 chars must return 400."""
    from fastapi import Depends, FastAPI
    from inbound.http.dependencies import get_session_id
    from inbound.http.errors import register_exception_handlers

    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/session")
    async def _ep(session_id: str = Depends(get_session_id)):
        return {"session_id": session_id}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        long_id = "x" * (_SESSION_ID_MAX_LEN + 1)
        resp = await client.get("/session", cookies={"session_id": long_id})

    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_session_id_valid_returns_value():
    """A valid session_id cookie must be returned as-is."""
    from fastapi import Depends, FastAPI
    from inbound.http.dependencies import get_session_id
    from inbound.http.errors import register_exception_handlers

    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/session")
    async def _ep(session_id: str = Depends(get_session_id)):
        return {"session_id": session_id}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/session", cookies={"session_id": "abc-123"})

    assert resp.status_code == 200
    assert resp.json()["session_id"] == "abc-123"
