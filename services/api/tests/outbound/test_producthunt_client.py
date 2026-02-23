"""Tests for outbound/producthunt/client.py — ProductHuntApiClient."""
import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from domain.pipeline.models import RawProduct
from outbound.producthunt.client import ProductHuntApiClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_client(token: str = "test-token") -> ProductHuntApiClient:
    return ProductHuntApiClient(api_token=token)


def _make_resp(data: dict, status_code: int = 200) -> MagicMock:
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = data
    resp.status_code = status_code
    return resp


def _ph_data(edges: list) -> dict:
    return {"data": {"posts": {"edges": edges}}}


def _make_edge(
    id: str = "ph-1",
    name: str = "TestApp",
    slug: str = "testapp",
    tagline: str | None = "A test app",
    description: str | None = "Description",
    url: str | None = "https://testapp.com",
    created_at: str | None = "2026-02-18T10:00:00Z",
    topics: list | None = None,
) -> dict:
    topic_edges = []
    if topics:
        topic_edges = [{"node": {"name": t}} for t in topics]
    return {
        "node": {
            "id": id,
            "name": name,
            "slug": slug,
            "tagline": tagline,
            "description": description,
            "url": url,
            "createdAt": created_at,
            "topics": {"edges": topic_edges},
        }
    }


# ---------------------------------------------------------------------------
# Empty token — early return
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_recent_products_returns_empty_when_no_token():
    """When api_token is empty, no HTTP call should be made and [] returned."""
    client = _make_client(token="")

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_recent_products()

    mock_http.post.assert_not_called()
    assert result == []


# ---------------------------------------------------------------------------
# Successful fetch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_recent_products_returns_products():
    client = _make_client()
    edge = _make_edge(id="123", name="AppX", topics=["Developer Tools"])
    data = _ph_data([edge])

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=_make_resp(data))
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_recent_products()

    assert len(result) == 1
    product = result[0]
    assert isinstance(product, RawProduct)
    assert product.external_id == "123"
    assert product.name == "AppX"
    assert product.category == "Developer Tools"


@pytest.mark.asyncio
async def test_fetch_recent_products_no_topics_sets_category_none():
    client = _make_client()
    edge = _make_edge(topics=[])  # no topics
    data = _ph_data([edge])

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=_make_resp(data))
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_recent_products()

    assert result[0].category is None


@pytest.mark.asyncio
async def test_fetch_recent_products_parses_created_at():
    client = _make_client()
    edge = _make_edge(created_at="2026-02-18T10:00:00Z")
    data = _ph_data([edge])

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=_make_resp(data))
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_recent_products()

    assert result[0].launched_at is not None
    assert result[0].launched_at.year == 2026


@pytest.mark.asyncio
async def test_fetch_recent_products_null_created_at_gives_none_launched_at():
    client = _make_client()
    edge = _make_edge(created_at=None)
    data = _ph_data([edge])

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=_make_resp(data))
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_recent_products()

    assert result[0].launched_at is None


@pytest.mark.asyncio
async def test_fetch_recent_products_invalid_created_at_gives_none():
    client = _make_client()
    edge = _make_edge(created_at="not-a-date")
    data = _ph_data([edge])

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=_make_resp(data))
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_recent_products()

    assert result[0].launched_at is None


@pytest.mark.asyncio
async def test_fetch_recent_products_empty_edges():
    client = _make_client()
    data = _ph_data([])

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=_make_resp(data))
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_recent_products()

    assert result == []


@pytest.mark.asyncio
async def test_fetch_recent_products_missing_data_key():
    """When response JSON is missing expected keys, should return empty list."""
    client = _make_client()
    data = {}  # completely empty

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=_make_resp(data))
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_recent_products()

    assert result == []


@pytest.mark.asyncio
async def test_fetch_recent_products_sends_authorization_header():
    client = _make_client(token="my-secret-token")
    data = _ph_data([])

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=_make_resp(data))
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        await client.fetch_recent_products()

    call_kwargs = mock_http.post.call_args.kwargs
    assert "Bearer my-secret-token" in call_kwargs["headers"]["Authorization"]


@pytest.mark.asyncio
async def test_fetch_recent_products_uses_limit_variable():
    client = _make_client()
    data = _ph_data([])

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=_make_resp(data))
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        await client.fetch_recent_products(limit=50)

    call_kwargs = mock_http.post.call_args.kwargs
    assert call_kwargs["json"]["variables"]["first"] == 50


@pytest.mark.asyncio
async def test_fetch_recent_products_multiple_products():
    client = _make_client()
    edges = [
        _make_edge(id="1", name="App1"),
        _make_edge(id="2", name="App2"),
        _make_edge(id="3", name="App3"),
    ]
    data = _ph_data(edges)

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=_make_resp(data))
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_recent_products()

    assert len(result) == 3
    names = [p.name for p in result]
    assert "App1" in names and "App2" in names and "App3" in names


@pytest.mark.asyncio
async def test_fetch_recent_products_optional_fields_can_be_none():
    """tagline, description, and url may be None — should not crash."""
    client = _make_client()
    edge = _make_edge(tagline=None, description=None, url=None)
    data = _ph_data([edge])

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=_make_resp(data))
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_recent_products()

    product = result[0]
    assert product.tagline is None
    assert product.description is None
    assert product.url is None


@pytest.mark.asyncio
async def test_fetch_recent_products_http_error_raises_after_retries():
    """raise_for_status raising should eventually raise after tenacity exhausts retries."""
    from tenacity import RetryError

    client = _make_client()

    bad_resp = MagicMock()
    bad_resp.raise_for_status = MagicMock(side_effect=Exception("HTTP 401"))

    with patch("outbound.producthunt.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=bad_resp)
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        with pytest.raises(Exception):  # tenacity wraps in RetryError
            await client.fetch_recent_products()
