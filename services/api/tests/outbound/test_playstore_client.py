"""Tests for outbound/playstore/client.py — PlayStoreClient."""
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from domain.pipeline.models import RawPost, RawProduct
from outbound.playstore.client import PlayStoreClient, _slugify


# ---------------------------------------------------------------------------
# _slugify helper
# ---------------------------------------------------------------------------


def test_slugify_basic():
    assert _slugify("Hello World") == "hello-world"


def test_slugify_special_characters():
    assert _slugify("Maps & Navigation!") == "maps-navigation"


def test_slugify_leading_trailing_separators():
    assert _slugify("  --My App--  ") == "my-app"


def test_slugify_numbers_preserved():
    assert _slugify("App 2.0") == "app-2-0"


def test_slugify_empty_string():
    assert _slugify("") == ""


def test_slugify_already_lowercase():
    assert _slugify("myapp") == "myapp"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _gps_item(
    app_id="com.example.app",
    title="Example App",
    description="A great example app",
    genre="Productivity",
    icon="https://example.com/icon.png",
):
    return {
        "appId": app_id,
        "title": title,
        "description": description,
        "genre": genre,
        "icon": icon,
    }


def _gps_review(
    review_id="review-abc",
    content="Works great!",
    score=5,
    at=None,
):
    return {
        "reviewId": review_id,
        "content": content,
        "score": score,
        "at": at or datetime(2026, 2, 18, 10, 0, 0),
    }


# ---------------------------------------------------------------------------
# PlayStoreClient.search_apps
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_search_apps_returns_raw_products():
    item = _gps_item()

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock(return_value=[item])):
        result = await client.search_apps(["productivity"])

    assert len(result) == 1
    product = result[0]
    assert isinstance(product, RawProduct)
    assert product.source == "play_store"


@pytest.mark.asyncio
async def test_search_apps_maps_external_id_from_app_id():
    item = _gps_item(app_id="com.test.myapp")

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock(return_value=[item])):
        result = await client.search_apps(["test"])

    assert result[0].external_id == "com.test.myapp"


@pytest.mark.asyncio
async def test_search_apps_maps_name_from_title():
    item = _gps_item(title="My Test App")

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock(return_value=[item])):
        result = await client.search_apps(["test"])

    assert result[0].name == "My Test App"


@pytest.mark.asyncio
async def test_search_apps_generates_slug_from_title():
    item = _gps_item(title="Google Maps")

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock(return_value=[item])):
        result = await client.search_apps(["maps"])

    assert result[0].slug == "google-maps"


@pytest.mark.asyncio
async def test_search_apps_maps_image_url_from_icon():
    item = _gps_item(icon="https://play.google.com/icon.png")

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock(return_value=[item])):
        result = await client.search_apps(["test"])

    assert result[0].image_url == "https://play.google.com/icon.png"


@pytest.mark.asyncio
async def test_search_apps_image_url_none_when_icon_absent():
    item = _gps_item()
    del item["icon"]

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock(return_value=[item])):
        result = await client.search_apps(["test"])

    assert result[0].image_url is None


@pytest.mark.asyncio
async def test_search_apps_maps_category_from_genre():
    item = _gps_item(genre="Social")

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock(return_value=[item])):
        result = await client.search_apps(["social"])

    assert result[0].category == "Social"


@pytest.mark.asyncio
async def test_search_apps_builds_play_store_url_from_app_id():
    item = _gps_item(app_id="com.example.app")

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock(return_value=[item])):
        result = await client.search_apps(["test"])

    assert result[0].url == "https://play.google.com/store/apps/details?id=com.example.app"


@pytest.mark.asyncio
async def test_search_apps_tagline_is_always_none():
    item = _gps_item()

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock(return_value=[item])):
        result = await client.search_apps(["test"])

    assert result[0].tagline is None


@pytest.mark.asyncio
async def test_search_apps_launched_at_is_always_none():
    item = _gps_item()

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock(return_value=[item])):
        result = await client.search_apps(["test"])

    assert result[0].launched_at is None


@pytest.mark.asyncio
async def test_search_apps_deduplicates_same_app_id_across_keywords():
    """Same appId returned by two keyword queries must appear only once."""
    item = _gps_item(app_id="com.dup.app", title="Dup App")

    call_count = 0

    async def to_thread_side_effect(fn, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        return [item]

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        result = await client.search_apps(["kw1", "kw2"])

    assert len(result) == 1


@pytest.mark.asyncio
async def test_search_apps_aggregates_distinct_items_across_keywords():
    item1 = _gps_item(app_id="com.app.one", title="App One")
    item2 = _gps_item(app_id="com.app.two", title="App Two")
    calls = iter([[item1], [item2]])

    async def to_thread_side_effect(fn, *args, **kwargs):
        return next(calls)

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        result = await client.search_apps(["kw1", "kw2"])

    assert len(result) == 2
    external_ids = {p.external_id for p in result}
    assert external_ids == {"com.app.one", "com.app.two"}


@pytest.mark.asyncio
async def test_search_apps_empty_keywords_returns_empty():
    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock()) as mock_thread:
        result = await client.search_apps([])

    assert result == []
    mock_thread.assert_not_called()


@pytest.mark.asyncio
async def test_search_apps_empty_results_returns_empty():
    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock(return_value=[])):
        result = await client.search_apps(["nothing"])

    assert result == []


@pytest.mark.asyncio
async def test_search_apps_exception_is_caught_and_skipped(caplog):
    """A scraper exception for one keyword must be caught and logged; returns empty list."""
    import logging

    async def to_thread_side_effect(fn, *args, **kwargs):
        raise RuntimeError("Network error")

    client = PlayStoreClient()

    with (
        patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect),
        caplog.at_level(logging.ERROR, logger="outbound.playstore.client"),
    ):
        result = await client.search_apps(["failing"])

    assert result == []


@pytest.mark.asyncio
async def test_search_apps_passes_limit_as_n_hits():
    """The limit argument must be forwarded as n_hits to gps.search."""
    item = _gps_item()
    captured_kwargs: dict = {}

    async def to_thread_side_effect(fn, keyword, n_hits):
        captured_kwargs["n_hits"] = n_hits
        return [item]

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        await client.search_apps(["test"], limit=15)

    assert captured_kwargs["n_hits"] == 15


# ---------------------------------------------------------------------------
# PlayStoreClient.fetch_reviews
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_reviews_returns_raw_posts():
    review = _gps_review()

    client = PlayStoreClient()

    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=([review], None)),
    ):
        result = await client.fetch_reviews("com.example.app")

    assert len(result) == 1
    post = result[0]
    assert isinstance(post, RawPost)
    assert post.source == "play_store"


@pytest.mark.asyncio
async def test_fetch_reviews_external_id_format():
    review = _gps_review(review_id="abc123")

    client = PlayStoreClient()

    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=([review], None)),
    ):
        result = await client.fetch_reviews("com.example.app")

    assert result[0].external_id == "playstore-com.example.app-abc123"


@pytest.mark.asyncio
async def test_fetch_reviews_maps_content_as_body():
    review = _gps_review(content="Crashes on startup")

    client = PlayStoreClient()

    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=([review], None)),
    ):
        result = await client.fetch_reviews("com.example.app")

    assert result[0].body == "Crashes on startup"


@pytest.mark.asyncio
async def test_fetch_reviews_empty_content_becomes_none():
    review = _gps_review(content="")

    client = PlayStoreClient()

    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=([review], None)),
    ):
        result = await client.fetch_reviews("com.example.app")

    assert result[0].body is None


@pytest.mark.asyncio
async def test_fetch_reviews_maps_score():
    review = _gps_review(score=2)

    client = PlayStoreClient()

    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=([review], None)),
    ):
        result = await client.fetch_reviews("com.example.app")

    assert result[0].score == 2


@pytest.mark.asyncio
async def test_fetch_reviews_maps_datetime_with_tzinfo():
    """A datetime with tzinfo must be used as-is."""
    aware_dt = datetime(2026, 2, 18, 10, 0, 0, tzinfo=UTC)
    review = _gps_review(at=aware_dt)

    client = PlayStoreClient()

    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=([review], None)),
    ):
        result = await client.fetch_reviews("com.example.app")

    assert result[0].external_created_at == aware_dt


@pytest.mark.asyncio
async def test_fetch_reviews_adds_utc_to_naive_datetime():
    """A naive datetime (no tzinfo) must have UTC attached."""
    naive_dt = datetime(2026, 2, 18, 10, 0, 0)  # tzinfo is None
    review = _gps_review(at=naive_dt)

    client = PlayStoreClient()

    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=([review], None)),
    ):
        result = await client.fetch_reviews("com.example.app")

    assert result[0].external_created_at.tzinfo is not None
    assert result[0].external_created_at.year == 2026


@pytest.mark.asyncio
async def test_fetch_reviews_falls_back_to_now_when_at_is_not_datetime(monkeypatch):
    """When 'at' is not a datetime instance, external_created_at must be near now."""
    review = _gps_review(at="2026-02-18")  # string, not datetime

    client = PlayStoreClient()

    before = datetime.now(UTC)
    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=([review], None)),
    ):
        result = await client.fetch_reviews("com.example.app")
    after = datetime.now(UTC)

    assert before <= result[0].external_created_at <= after


@pytest.mark.asyncio
async def test_fetch_reviews_external_url_uses_app_id():
    review = _gps_review()

    client = PlayStoreClient()

    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=([review], None)),
    ):
        result = await client.fetch_reviews("com.target.app")

    assert result[0].external_url == "https://play.google.com/store/apps/details?id=com.target.app"


@pytest.mark.asyncio
async def test_fetch_reviews_title_is_empty_string():
    """Play Store reviews have no title — RawPost.title must be empty string."""
    review = _gps_review()

    client = PlayStoreClient()

    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=([review], None)),
    ):
        result = await client.fetch_reviews("com.example.app")

    assert result[0].title == ""


@pytest.mark.asyncio
async def test_fetch_reviews_num_comments_is_zero():
    review = _gps_review()

    client = PlayStoreClient()

    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=([review], None)),
    ):
        result = await client.fetch_reviews("com.example.app")

    assert result[0].num_comments == 0


@pytest.mark.asyncio
async def test_fetch_reviews_empty_reviews_returns_empty_list():
    client = PlayStoreClient()

    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=([], None)),
    ):
        result = await client.fetch_reviews("com.example.app")

    assert result == []


@pytest.mark.asyncio
async def test_fetch_reviews_multiple_reviews_all_mapped():
    reviews = [_gps_review(review_id=f"r{i}", score=i) for i in range(1, 4)]

    client = PlayStoreClient()

    with patch(
        "outbound.playstore.client.asyncio.to_thread",
        new=AsyncMock(return_value=(reviews, None)),
    ):
        result = await client.fetch_reviews("com.example.app", count=3)

    assert len(result) == 3
    scores = {p.score for p in result}
    assert scores == {1, 2, 3}


@pytest.mark.asyncio
async def test_fetch_reviews_passes_count_to_scraper():
    """The count argument must be forwarded to gps.reviews."""
    captured: dict = {}

    async def to_thread_side_effect(fn, app_id, count):
        captured["count"] = count
        return ([], None)

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        await client.fetch_reviews("com.example.app", count=200)

    assert captured["count"] == 200


@pytest.mark.asyncio
async def test_fetch_reviews_exception_is_caught_and_returns_empty(caplog):
    """Scraper exception must be caught and logged; returns empty list."""
    import logging

    async def to_thread_side_effect(fn, *args, **kwargs):
        raise RuntimeError("Scraper unavailable")

    client = PlayStoreClient()

    with (
        patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect),
        caplog.at_level(logging.ERROR, logger="outbound.playstore.client"),
    ):
        result = await client.fetch_reviews("com.example.app")

    assert result == []
