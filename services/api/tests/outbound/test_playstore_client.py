"""Tests for outbound/playstore/client.py — PlayStoreClient."""
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from domain.pipeline.models import RawPost, RawProduct
from outbound.playstore.client import PlayStoreClient, _slugify, _parse_released


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
# _parse_released helper
# ---------------------------------------------------------------------------


def test_parse_released_valid():
    result = _parse_released("Jan 15, 2024")
    assert result == datetime(2024, 1, 15, tzinfo=UTC)


def test_parse_released_none():
    assert _parse_released(None) is None


def test_parse_released_empty():
    assert _parse_released("") is None


def test_parse_released_invalid():
    assert _parse_released("not-a-date") is None


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


def _gps_detail(
    app_id="com.example.app",
    released="Jan 15, 2026",
):
    return {
        "appId": app_id,
        "released": released,
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
# PlayStoreClient.search_apps — with release date filtering
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_search_apps_returns_recent_apps():
    """Apps released within max_age_days are returned."""
    item = _gps_item()
    detail = _gps_detail(released="Jan 15, 2026")

    call_count = 0

    async def to_thread_side_effect(fn, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return [item]  # gps.search
        return detail  # gps.app

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        result = await client.search_apps(["productivity"], max_age_days=365)

    assert len(result) == 1
    product = result[0]
    assert isinstance(product, RawProduct)
    assert product.source == "play_store"
    assert product.launched_at == datetime(2026, 1, 15, tzinfo=UTC)


@pytest.mark.asyncio
async def test_search_apps_filters_old_apps():
    """Apps released before cutoff are filtered out."""
    item = _gps_item()
    detail = _gps_detail(released="Jan 1, 2020")

    call_count = 0

    async def to_thread_side_effect(fn, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return [item]
        return detail

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        result = await client.search_apps(["productivity"], max_age_days=365)

    assert result == []


@pytest.mark.asyncio
async def test_search_apps_skips_app_when_released_is_none():
    """Apps without a released date are skipped."""
    item = _gps_item()
    detail = _gps_detail(released=None)

    call_count = 0

    async def to_thread_side_effect(fn, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return [item]
        return detail

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        result = await client.search_apps(["productivity"], max_age_days=365)

    assert result == []


@pytest.mark.asyncio
async def test_search_apps_skips_app_when_detail_fetch_fails():
    """When gps.app() fails for an app, that app is skipped."""
    item = _gps_item()

    call_count = 0

    async def to_thread_side_effect(fn, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return [item]
        raise RuntimeError("detail fetch error")

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        result = await client.search_apps(["productivity"], max_age_days=365)

    assert result == []


@pytest.mark.asyncio
async def test_search_apps_records_launched_at():
    """launched_at is set to the parsed released date."""
    item = _gps_item()
    detail = _gps_detail(released="Feb 1, 2026")

    call_count = 0

    async def to_thread_side_effect(fn, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return [item]
        return detail

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        result = await client.search_apps(["test"], max_age_days=365)

    assert result[0].launched_at == datetime(2026, 2, 1, tzinfo=UTC)


@pytest.mark.asyncio
async def test_search_apps_deduplicates_across_keywords():
    """Same appId from two keywords appears only once."""
    item = _gps_item(app_id="com.dup.app", title="Dup App")
    detail = _gps_detail(app_id="com.dup.app", released="Jan 15, 2026")

    call_count = 0

    async def to_thread_side_effect(fn, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count in (1, 3):  # search calls
            return [item]
        return detail  # detail calls

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        result = await client.search_apps(["kw1", "kw2"], max_age_days=365)

    assert len(result) == 1


@pytest.mark.asyncio
async def test_search_apps_respects_limit():
    """Results are capped at the specified limit."""
    items = [_gps_item(app_id=f"com.app.{i}", title=f"App {i}") for i in range(5)]

    call_count = 0

    async def to_thread_side_effect(fn, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return items
        return _gps_detail(released="Jan 15, 2026")

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        result = await client.search_apps(["test"], limit=2, max_age_days=365)

    assert len(result) <= 2


@pytest.mark.asyncio
async def test_search_apps_empty_keywords_returns_empty():
    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", new=AsyncMock()) as mock_thread:
        result = await client.search_apps([])

    assert result == []
    mock_thread.assert_not_called()


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
async def test_search_apps_fetches_more_than_limit_from_search():
    """search uses limit*3 as n_hits to have enough candidates for filtering."""
    item = _gps_item()
    detail = _gps_detail(released="Jan 15, 2026")
    captured_n_hits = None

    call_count = 0

    async def to_thread_side_effect(fn, *args, **kwargs):
        nonlocal call_count, captured_n_hits
        call_count += 1
        if call_count == 1:
            # gps.search call
            captured_n_hits = kwargs.get("n_hits") or (args[1] if len(args) > 1 else None)
            return [item]
        return detail

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        await client.search_apps(["test"], limit=10, max_age_days=365)

    assert captured_n_hits == 30  # limit * 3


@pytest.mark.asyncio
async def test_search_apps_maps_fields_correctly():
    """Verify all fields are mapped from search result + detail."""
    item = _gps_item(
        app_id="com.test.myapp",
        title="My Test App",
        description="A great app",
        genre="Social",
        icon="https://example.com/icon.png",
    )
    detail = _gps_detail(app_id="com.test.myapp", released="Feb 10, 2026")

    call_count = 0

    async def to_thread_side_effect(fn, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return [item]
        return detail

    client = PlayStoreClient()

    with patch("outbound.playstore.client.asyncio.to_thread", side_effect=to_thread_side_effect):
        result = await client.search_apps(["test"], max_age_days=365)

    p = result[0]
    assert p.external_id == "com.test.myapp"
    assert p.name == "My Test App"
    assert p.category == "Social"
    assert p.image_url == "https://example.com/icon.png"
    assert p.url == "https://play.google.com/store/apps/details?id=com.test.myapp"
    assert p.tagline is None
    assert p.source == "play_store"


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
