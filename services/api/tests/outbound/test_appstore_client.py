"""Tests for outbound/appstore/client.py — AppStoreClient."""
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from domain.pipeline.models import RawPost, RawProduct
from outbound.appstore.client import AppStoreClient, _slugify, _parse_release_date


# ---------------------------------------------------------------------------
# _slugify helper
# ---------------------------------------------------------------------------


def test_slugify_basic():
    assert _slugify("Hello World") == "hello-world"


def test_slugify_special_characters():
    assert _slugify("App & Tools!") == "app-tools"


def test_slugify_leading_trailing_separators():
    assert _slugify("  --My App--  ") == "my-app"


def test_slugify_numbers_preserved():
    assert _slugify("App 2.0") == "app-2-0"


def test_slugify_empty_string():
    assert _slugify("") == ""


def test_slugify_already_lowercase():
    assert _slugify("myapp") == "myapp"


# ---------------------------------------------------------------------------
# _parse_release_date helper
# ---------------------------------------------------------------------------


def test_parse_release_date_valid():
    result = _parse_release_date("2024-01-15T08:00:00Z")
    assert result.year == 2024
    assert result.month == 1
    assert result.day == 15


def test_parse_release_date_none():
    assert _parse_release_date(None) is None


def test_parse_release_date_empty():
    assert _parse_release_date("") is None


def test_parse_release_date_invalid():
    assert _parse_release_date("not-a-date") is None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_async_http(get_response=None):
    """Build a mock httpx.AsyncClient context manager with pre-set GET response."""
    http = AsyncMock()
    http.__aenter__ = AsyncMock(return_value=http)
    http.__aexit__ = AsyncMock(return_value=False)

    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json = MagicMock(return_value=get_response or {})
    http.get = AsyncMock(return_value=resp)

    return http


def _itunes_item(
    track_id=123456,
    track_name="TestApp",
    description="A test application",
    track_view_url="https://apps.apple.com/app/id123456",
    primary_genre_name="Productivity",
    artwork_url_512="https://example.com/icon512.png",
    artwork_url_100=None,
    release_date="2026-01-15T08:00:00Z",
):
    item = {
        "trackId": track_id,
        "trackName": track_name,
        "description": description,
        "trackViewUrl": track_view_url,
        "primaryGenreName": primary_genre_name,
    }
    if artwork_url_512 is not None:
        item["artworkUrl512"] = artwork_url_512
    if artwork_url_100 is not None:
        item["artworkUrl100"] = artwork_url_100
    if release_date is not None:
        item["releaseDate"] = release_date
    return item


def _rss_entry(
    entry_id="review-001",
    title="Great app",
    content="Really useful daily",
    rating="5",
    updated="2026-02-18T10:00:00Z",
    include_im_rating=True,
):
    """Build an Apple RSS feed entry dict (dict-style labels)."""
    entry = {
        "id": {"label": entry_id},
        "title": {"label": title},
        "content": {"label": content},
        "updated": {"label": updated},
    }
    if include_im_rating:
        entry["im:rating"] = {"label": rating}
    return entry


def _rss_feed_response(app_id: str, entries: list) -> dict:
    return {"feed": {"entry": entries}}


# ---------------------------------------------------------------------------
# AppStoreClient.search_apps — with releaseDate filtering
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_search_apps_returns_raw_products():
    item = _itunes_item()
    http = _make_async_http({"results": [item]})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["productivity"])

    assert len(result) == 1
    product = result[0]
    assert isinstance(product, RawProduct)
    assert product.external_id == "123456"
    assert product.name == "TestApp"
    assert product.slug == "testapp-123456"
    assert product.source == "app_store"


@pytest.mark.asyncio
async def test_search_apps_records_launched_at():
    """launched_at must be set from releaseDate."""
    item = _itunes_item(release_date="2026-01-15T08:00:00Z")
    http = _make_async_http({"results": [item]})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["app"])

    assert result[0].launched_at is not None
    assert result[0].launched_at.year == 2026
    assert result[0].launched_at.month == 1


@pytest.mark.asyncio
async def test_search_apps_filters_old_apps():
    """Apps with releaseDate before cutoff are excluded."""
    item = _itunes_item(release_date="2015-01-01T00:00:00Z")
    http = _make_async_http({"results": [item]})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["old"], max_age_days=365)

    assert result == []


@pytest.mark.asyncio
async def test_search_apps_includes_app_without_release_date():
    """Apps without releaseDate field are included (no filtering)."""
    item = _itunes_item(release_date=None)
    http = _make_async_http({"results": [item]})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["app"])

    assert len(result) == 1
    assert result[0].launched_at is None


@pytest.mark.asyncio
async def test_search_apps_maps_image_url_from_artworkurl512():
    item = _itunes_item(artwork_url_512="https://example.com/icon512.png")
    http = _make_async_http({"results": [item]})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["photo"])

    assert result[0].image_url == "https://example.com/icon512.png"


@pytest.mark.asyncio
async def test_search_apps_falls_back_to_artworkurl100_when_512_absent():
    item = _itunes_item(artwork_url_512=None, artwork_url_100="https://example.com/icon100.png")
    http = _make_async_http({"results": [item]})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["photo"])

    assert result[0].image_url == "https://example.com/icon100.png"


@pytest.mark.asyncio
async def test_search_apps_image_url_none_when_both_artwork_absent():
    item = _itunes_item(artwork_url_512=None, artwork_url_100=None)
    http = _make_async_http({"results": [item]})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["photo"])

    assert result[0].image_url is None


@pytest.mark.asyncio
async def test_search_apps_maps_category_from_primary_genre():
    item = _itunes_item(primary_genre_name="Games")
    http = _make_async_http({"results": [item]})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["game"])

    assert result[0].category == "Games"


@pytest.mark.asyncio
async def test_search_apps_maps_url_from_track_view_url():
    item = _itunes_item(track_view_url="https://apps.apple.com/app/id999")
    http = _make_async_http({"results": [item]})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["test"])

    assert result[0].url == "https://apps.apple.com/app/id999"


@pytest.mark.asyncio
async def test_search_apps_tagline_is_always_none():
    """App Store items have no tagline field; RawProduct.tagline must be None."""
    item = _itunes_item()
    http = _make_async_http({"results": [item]})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["app"])

    assert result[0].tagline is None


@pytest.mark.asyncio
async def test_search_apps_deduplicates_across_keywords():
    """The same trackId from two keyword responses must appear only once."""
    item = _itunes_item(track_id=42, track_name="SameApp")
    http = _make_async_http({"results": [item]})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["keyword1", "keyword2"])

    assert len(result) == 1


@pytest.mark.asyncio
async def test_search_apps_multiple_keywords_aggregate_distinct_items():
    call_count = 0
    items_per_call = [
        {"results": [_itunes_item(track_id=1, track_name="App1")]},
        {"results": [_itunes_item(track_id=2, track_name="App2")]},
    ]

    http = AsyncMock()
    http.__aenter__ = AsyncMock(return_value=http)
    http.__aexit__ = AsyncMock(return_value=False)

    async def get_side_effect(*args, **kwargs):
        nonlocal call_count
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.json = MagicMock(return_value=items_per_call[call_count])
        call_count += 1
        return resp

    http.get = AsyncMock(side_effect=get_side_effect)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["kw1", "kw2"])

    assert len(result) == 2
    names = {p.name for p in result}
    assert names == {"App1", "App2"}


@pytest.mark.asyncio
async def test_search_apps_empty_results_returns_empty_list():
    http = _make_async_http({"results": []})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["nothing"])

    assert result == []


@pytest.mark.asyncio
async def test_search_apps_empty_keyword_list_returns_empty():
    http = _make_async_http({})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps([])

    assert result == []
    http.get.assert_not_called()


@pytest.mark.asyncio
async def test_search_apps_missing_results_key_returns_empty():
    """Response without 'results' key should yield no products (not crash)."""
    http = _make_async_http({})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.search_apps(["test"])

    assert result == []


@pytest.mark.asyncio
async def test_search_apps_http_error_is_caught_and_skipped(caplog):
    """An HTTP error for one keyword must be logged and skipped; returns empty list."""
    import logging

    bad_resp = MagicMock()
    bad_resp.raise_for_status = MagicMock(side_effect=Exception("HTTP 500"))
    bad_resp.json = MagicMock(return_value={})

    http = AsyncMock()
    http.__aenter__ = AsyncMock(return_value=http)
    http.__aexit__ = AsyncMock(return_value=False)
    http.get = AsyncMock(return_value=bad_resp)

    client = AppStoreClient()

    with (
        patch("outbound.appstore.client.httpx.AsyncClient", return_value=http),
        caplog.at_level(logging.ERROR, logger="outbound.appstore.client"),
    ):
        result = await client.search_apps(["failing-keyword"])

    assert result == []


@pytest.mark.asyncio
async def test_search_apps_limit_capped_at_200():
    """limit > 200 must be sent as 200 in the iTunes API params."""
    http = _make_async_http({"results": []})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        await client.search_apps(["test"], limit=500)

    call_kwargs = http.get.call_args.kwargs
    assert call_kwargs["params"]["limit"] == 200


@pytest.mark.asyncio
async def test_search_apps_sends_correct_itunes_params():
    http = _make_async_http({"results": []})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        await client.search_apps(["todo"], limit=10)

    call_kwargs = http.get.call_args.kwargs
    assert call_kwargs["params"]["term"] == "todo"
    assert call_kwargs["params"]["entity"] == "software"
    # fetch_limit = limit*3 = 30, capped at 200
    assert call_kwargs["params"]["limit"] == 30


@pytest.mark.asyncio
async def test_search_apps_fetches_more_candidates():
    """search uses limit*3 as the actual fetch limit for filtering headroom."""
    http = _make_async_http({"results": []})

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        await client.search_apps(["test"], limit=10)

    call_kwargs = http.get.call_args.kwargs
    assert call_kwargs["params"]["limit"] == 30  # 10 * 3


# ---------------------------------------------------------------------------
# AppStoreClient.fetch_new_apps
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_new_apps_returns_products():
    rss_data = {
        "feed": {
            "results": [
                {
                    "id": "999",
                    "name": "New App",
                    "url": "https://apps.apple.com/app/id999",
                    "releaseDate": "2026-02-20",
                    "artworkUrl100": "https://example.com/icon.png",
                    "genres": ["Productivity"],
                    "genreIds": ["6007"],
                },
            ]
        }
    }
    http = _make_async_http(rss_data)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_new_apps()

    assert len(result) == 1
    p = result[0]
    assert p.external_id == "999"
    assert p.name == "New App"
    assert p.source == "app_store"
    assert p.category == "Productivity"
    assert p.image_url == "https://example.com/icon.png"


@pytest.mark.asyncio
async def test_fetch_new_apps_filters_by_genre_id():
    rss_data = {
        "feed": {
            "results": [
                {
                    "id": "1",
                    "name": "App A",
                    "genres": ["Productivity"],
                    "genreIds": ["6007"],
                },
                {
                    "id": "2",
                    "name": "App B",
                    "genres": ["Games"],
                    "genreIds": ["6014"],
                },
            ]
        }
    }
    http = _make_async_http(rss_data)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_new_apps(genre_id=6007)

    assert len(result) == 1
    assert result[0].name == "App A"


@pytest.mark.asyncio
async def test_fetch_new_apps_no_genre_filter_returns_all():
    rss_data = {
        "feed": {
            "results": [
                {"id": "1", "name": "App A", "genres": ["Productivity"], "genreIds": ["6007"]},
                {"id": "2", "name": "App B", "genres": ["Games"], "genreIds": ["6014"]},
            ]
        }
    }
    http = _make_async_http(rss_data)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_new_apps()

    assert len(result) == 2


@pytest.mark.asyncio
async def test_fetch_new_apps_empty_feed_returns_empty():
    rss_data = {"feed": {"results": []}}
    http = _make_async_http(rss_data)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_new_apps()

    assert result == []


@pytest.mark.asyncio
async def test_fetch_new_apps_http_error_returns_empty(caplog):
    import logging

    bad_resp = MagicMock()
    bad_resp.raise_for_status = MagicMock(side_effect=Exception("HTTP 500"))

    http = AsyncMock()
    http.__aenter__ = AsyncMock(return_value=http)
    http.__aexit__ = AsyncMock(return_value=False)
    http.get = AsyncMock(return_value=bad_resp)

    client = AppStoreClient()

    with (
        patch("outbound.appstore.client.httpx.AsyncClient", return_value=http),
        caplog.at_level(logging.ERROR, logger="outbound.appstore.client"),
    ):
        result = await client.fetch_new_apps()

    assert result == []


@pytest.mark.asyncio
async def test_fetch_new_apps_category_none_when_genres_empty():
    rss_data = {
        "feed": {
            "results": [
                {"id": "1", "name": "App A", "genres": [], "genreIds": []},
            ]
        }
    }
    http = _make_async_http(rss_data)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_new_apps()

    assert result[0].category is None


# ---------------------------------------------------------------------------
# AppStoreClient.fetch_reviews
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_reviews_returns_raw_posts():
    entry = _rss_entry()
    response = _rss_feed_response("123456", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("123456", pages=1)

    assert len(result) == 1
    post = result[0]
    assert isinstance(post, RawPost)
    assert post.source == "app_store"


@pytest.mark.asyncio
async def test_fetch_reviews_external_id_format():
    entry = _rss_entry(entry_id="rev-999")
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert result[0].external_id == "appstore-111-rev-999"


@pytest.mark.asyncio
async def test_fetch_reviews_maps_title_from_dict_label():
    entry = _rss_entry(title="Fantastic!")
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert result[0].title == "Fantastic!"


@pytest.mark.asyncio
async def test_fetch_reviews_maps_title_from_plain_string():
    """title as a plain string (non-dict) must also be handled."""
    entry = _rss_entry()
    entry["title"] = "Plain title"  # override to plain string
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert result[0].title == "Plain title"


@pytest.mark.asyncio
async def test_fetch_reviews_maps_body_from_dict_label():
    entry = _rss_entry(content="Love this app!")
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert result[0].body == "Love this app!"


@pytest.mark.asyncio
async def test_fetch_reviews_maps_body_from_plain_string():
    entry = _rss_entry()
    entry["content"] = "Plain body"
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert result[0].body == "Plain body"


@pytest.mark.asyncio
async def test_fetch_reviews_empty_content_becomes_none():
    """An empty content label must be stored as None."""
    entry = _rss_entry(content="")
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert result[0].body is None


@pytest.mark.asyncio
async def test_fetch_reviews_maps_rating_from_dict_label():
    entry = _rss_entry(rating="4")
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert result[0].score == 4


@pytest.mark.asyncio
async def test_fetch_reviews_maps_rating_from_plain_string():
    entry = _rss_entry()
    entry["im:rating"] = "3"  # plain string, not dict
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert result[0].score == 3


@pytest.mark.asyncio
async def test_fetch_reviews_skips_entries_without_im_rating():
    """Entries missing 'im:rating' key (app metadata entry) must be skipped."""
    entry_no_rating = _rss_entry(include_im_rating=False)
    entry_with_rating = _rss_entry(entry_id="real-review", title="Good")
    response = _rss_feed_response("111", [entry_no_rating, entry_with_rating])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert len(result) == 1
    assert result[0].external_id == "appstore-111-real-review"


@pytest.mark.asyncio
async def test_fetch_reviews_parses_updated_iso_timestamp():
    entry = _rss_entry(updated="2026-02-18T10:00:00Z")
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert result[0].external_created_at.year == 2026
    assert result[0].external_created_at.month == 2
    assert result[0].external_created_at.day == 18


@pytest.mark.asyncio
async def test_fetch_reviews_falls_back_to_now_on_invalid_date():
    """Malformed updated date must fall back to datetime.now(UTC) without crashing."""
    entry = _rss_entry(updated="not-a-date")
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    before = datetime.now(UTC)
    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)
    after = datetime.now(UTC)

    assert before <= result[0].external_created_at <= after


@pytest.mark.asyncio
async def test_fetch_reviews_falls_back_to_now_when_updated_absent():
    entry = _rss_entry()
    del entry["updated"]  # remove the updated key entirely
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    before = datetime.now(UTC)
    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)
    after = datetime.now(UTC)

    assert before <= result[0].external_created_at <= after


@pytest.mark.asyncio
async def test_fetch_reviews_external_url_uses_app_id():
    entry = _rss_entry()
    response = _rss_feed_response("777", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("777", pages=1)

    assert result[0].external_url == "https://apps.apple.com/app/id777"


@pytest.mark.asyncio
async def test_fetch_reviews_num_comments_is_zero():
    entry = _rss_entry()
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert result[0].num_comments == 0


@pytest.mark.asyncio
async def test_fetch_reviews_requests_multiple_pages():
    """With pages=3, fetch must make 3 separate GET requests."""
    entry = _rss_entry()
    response = _rss_feed_response("111", [entry])
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=3)

    assert http.get.call_count == 3
    assert len(result) == 3  # one entry per page


@pytest.mark.asyncio
async def test_fetch_reviews_empty_feed_returns_empty_list():
    response = {"feed": {"entry": []}}
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert result == []


@pytest.mark.asyncio
async def test_fetch_reviews_missing_feed_key_returns_empty():
    response = {}
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        result = await client.fetch_reviews("111", pages=1)

    assert result == []


@pytest.mark.asyncio
async def test_fetch_reviews_http_error_is_caught_and_page_skipped(caplog):
    """An HTTP error for one page must be caught; other pages still process."""
    import logging

    call_count = 0
    good_resp = MagicMock()
    good_resp.raise_for_status = MagicMock()
    good_resp.json = MagicMock(return_value=_rss_feed_response("111", [_rss_entry()]))

    bad_resp = MagicMock()
    bad_resp.raise_for_status = MagicMock(side_effect=Exception("HTTP 503"))
    bad_resp.json = MagicMock(return_value={})

    http = AsyncMock()
    http.__aenter__ = AsyncMock(return_value=http)
    http.__aexit__ = AsyncMock(return_value=False)

    async def get_side_effect(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        return good_resp if call_count == 1 else bad_resp

    http.get = AsyncMock(side_effect=get_side_effect)

    client = AppStoreClient()

    with (
        patch("outbound.appstore.client.httpx.AsyncClient", return_value=http),
        caplog.at_level(logging.ERROR, logger="outbound.appstore.client"),
    ):
        result = await client.fetch_reviews("111", pages=2)

    # Page 1 succeeded (1 post); page 2 failed (0 posts)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_fetch_reviews_uses_correct_url_format():
    """The RSS URL must embed country, page number, and app_id."""
    response = {"feed": {"entry": []}}
    http = _make_async_http(response)

    client = AppStoreClient()

    with patch("outbound.appstore.client.httpx.AsyncClient", return_value=http):
        await client.fetch_reviews("888", country="gb", pages=1)

    called_url = http.get.call_args.args[0]
    assert "gb" in called_url
    assert "888" in called_url
    assert "page=1" in called_url
