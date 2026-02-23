"""Tests for outbound/rss/client.py — RssFeedClient and SSRF-protection helpers."""
import hashlib
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from outbound.rss.client import RssFeedClient, _is_safe_url, _parse_published


# ---------------------------------------------------------------------------
# _is_safe_url — SSRF protection
# ---------------------------------------------------------------------------


def test_is_safe_url_valid_https():
    assert _is_safe_url("https://hnrss.org/newest") is True


def test_is_safe_url_valid_http():
    assert _is_safe_url("http://feeds.example.com/rss") is True


def test_is_safe_url_rejects_ftp_scheme():
    assert _is_safe_url("ftp://example.com/feed.xml") is False


def test_is_safe_url_rejects_file_scheme():
    assert _is_safe_url("file:///etc/passwd") is False


def test_is_safe_url_rejects_localhost():
    assert _is_safe_url("http://localhost/feed") is False


def test_is_safe_url_rejects_127_0_0_1():
    assert _is_safe_url("http://127.0.0.1/feed") is False


def test_is_safe_url_rejects_0_0_0_0():
    assert _is_safe_url("http://0.0.0.0/feed") is False


def test_is_safe_url_rejects_ipv6_loopback():
    assert _is_safe_url("http://[::1]/feed") is False


def test_is_safe_url_rejects_10_dot_prefix():
    assert _is_safe_url("http://10.0.0.5/feed") is False


def test_is_safe_url_rejects_192_168_prefix():
    assert _is_safe_url("http://192.168.1.1/feed") is False


def test_is_safe_url_rejects_172_16_prefix():
    assert _is_safe_url("http://172.16.0.1/feed") is False


def test_is_safe_url_rejects_172_31_prefix():
    assert _is_safe_url("http://172.31.255.255/feed") is False


def test_is_safe_url_allows_172_15():
    """172.15.x.x is NOT a private range — should be allowed."""
    assert _is_safe_url("http://172.15.0.1/feed") is True


def test_is_safe_url_allows_172_32():
    """172.32.x.x is NOT a private range — should be allowed."""
    assert _is_safe_url("http://172.32.0.1/feed") is True


def test_is_safe_url_rejects_dot_local():
    assert _is_safe_url("http://mybox.local/feed") is False


def test_is_safe_url_rejects_dot_internal():
    assert _is_safe_url("http://service.internal/feed") is False


def test_is_safe_url_rejects_empty_string():
    """An empty string has no scheme and no host — must be rejected."""
    assert _is_safe_url("") is False


def test_is_safe_url_rejects_no_host():
    """URL with recognized scheme but no host should be rejected."""
    assert _is_safe_url("https:///path/only") is False


def test_is_safe_url_rejects_unknown_scheme_only():
    assert _is_safe_url("javascript:alert(1)") is False


def test_is_safe_url_returns_false_on_urlparse_value_error():
    """When urlparse raises ValueError, _is_safe_url should return False."""
    from unittest.mock import patch
    from urllib.parse import urlparse

    with patch("outbound.rss.client.urlparse", side_effect=ValueError("bad url")):
        result = _is_safe_url("https://example.com/feed")

    assert result is False


# ---------------------------------------------------------------------------
# _parse_published
# ---------------------------------------------------------------------------


def test_parse_published_uses_published_field():
    entry = MagicMock()
    entry.get = lambda key, default=None: {
        "published": "Tue, 18 Feb 2026 10:00:00 +0000",
        "updated": None,
    }.get(key, default)

    result = _parse_published(entry)
    assert result.year == 2026
    assert result.month == 2
    assert result.day == 18


def test_parse_published_falls_back_to_updated():
    entry = MagicMock()
    entry.get = lambda key, default=None: {
        "published": None,
        "updated": "Tue, 18 Feb 2026 10:00:00 +0000",
    }.get(key, default)

    result = _parse_published(entry)
    assert result.year == 2026


def test_parse_published_falls_back_to_now_when_neither():
    before = datetime.now(UTC)
    entry = MagicMock()
    entry.get = lambda key, default=None: None

    result = _parse_published(entry)
    after = datetime.now(UTC)

    # Should be within the test execution window
    assert before <= result <= after


def test_parse_published_falls_back_to_now_on_invalid_format():
    entry = MagicMock()
    entry.get = lambda key, default=None: {
        "published": "not-a-date",
        "updated": None,
    }.get(key, default)

    before = datetime.now(UTC)
    result = _parse_published(entry)
    after = datetime.now(UTC)

    assert before <= result <= after


# ---------------------------------------------------------------------------
# RssFeedClient.fetch_posts
# ---------------------------------------------------------------------------


def _make_entry(title="Article", link="https://example.com/1", summary="Summary",
                published="Tue, 18 Feb 2026 10:00:00 +0000"):
    entry = MagicMock()
    entry.get = lambda key, default=None: {
        "title": title,
        "link": link,
        "summary": summary,
        "published": published,
        "updated": None,
    }.get(key, default)
    return entry


def _make_feed(entries):
    feed = MagicMock()
    feed.entries = entries
    return feed


@pytest.mark.asyncio
async def test_fetch_posts_skips_unsafe_urls():
    """Unsafe URLs should be skipped entirely — no HTTP request made."""
    client = RssFeedClient()

    with patch("outbound.rss.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_posts(["http://localhost/feed", "http://127.0.0.1/rss"])

    mock_http.get.assert_not_called()
    assert result == []


@pytest.mark.asyncio
async def test_fetch_posts_empty_feed_list_returns_empty():
    client = RssFeedClient()
    result = await client.fetch_posts([])
    assert result == []


@pytest.mark.asyncio
async def test_fetch_posts_single_entry():
    entry = _make_entry(title="HN Post", link="https://hn.example.com/123")
    feed = _make_feed([entry])

    client = RssFeedClient()

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.text = "<rss/>"

    with (
        patch("outbound.rss.client.httpx.AsyncClient") as mock_cls,
        patch("outbound.rss.client.feedparser.parse", return_value=feed),
    ):
        mock_http = AsyncMock()
        mock_http.get = AsyncMock(return_value=mock_resp)
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_posts(["https://hnrss.org/newest"])

    assert len(result) == 1
    post = result[0]
    assert post.source == "rss"
    assert post.title == "HN Post"
    assert post.external_url == "https://hn.example.com/123"
    assert post.score == 0
    assert post.num_comments == 0
    assert post.subreddit is None


@pytest.mark.asyncio
async def test_fetch_posts_external_id_is_sha256_of_link():
    link = "https://hn.example.com/article-42"
    expected_id = hashlib.sha256(link.encode()).hexdigest()

    entry = _make_entry(link=link)
    feed = _make_feed([entry])

    client = RssFeedClient()
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.text = ""

    with (
        patch("outbound.rss.client.httpx.AsyncClient") as mock_cls,
        patch("outbound.rss.client.feedparser.parse", return_value=feed),
    ):
        mock_http = AsyncMock()
        mock_http.get = AsyncMock(return_value=mock_resp)
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_posts(["https://hnrss.org/newest"])

    assert result[0].external_id == expected_id


@pytest.mark.asyncio
async def test_fetch_posts_caps_at_20_entries():
    entries = [_make_entry(link=f"https://example.com/{i}") for i in range(25)]
    feed = _make_feed(entries)

    client = RssFeedClient()
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.text = ""

    with (
        patch("outbound.rss.client.httpx.AsyncClient") as mock_cls,
        patch("outbound.rss.client.feedparser.parse", return_value=feed),
    ):
        mock_http = AsyncMock()
        mock_http.get = AsyncMock(return_value=mock_resp)
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_posts(["https://hnrss.org/newest"])

    assert len(result) == 20


@pytest.mark.asyncio
async def test_fetch_posts_http_error_is_swallowed():
    """An HTTP error for one feed should not propagate; returns empty list."""
    client = RssFeedClient()

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock(side_effect=Exception("HTTP 500"))
    mock_resp.text = ""

    with patch("outbound.rss.client.httpx.AsyncClient") as mock_cls:
        mock_http = AsyncMock()
        mock_http.get = AsyncMock(return_value=mock_resp)
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_posts(["https://feeds.example.com/rss"])

    assert result == []


@pytest.mark.asyncio
async def test_fetch_posts_multiple_feeds_combined():
    entry1 = _make_entry(title="Feed1 Article", link="https://feed1.com/a")
    entry2 = _make_entry(title="Feed2 Article", link="https://feed2.com/b")
    feed1 = _make_feed([entry1])
    feed2 = _make_feed([entry2])

    client = RssFeedClient()
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.text = ""

    feed_responses = iter([feed1, feed2])

    with (
        patch("outbound.rss.client.httpx.AsyncClient") as mock_cls,
        patch("outbound.rss.client.feedparser.parse", side_effect=lambda _: next(feed_responses)),
    ):
        mock_http = AsyncMock()
        mock_http.get = AsyncMock(return_value=mock_resp)
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_posts([
            "https://feed1.example.com/rss",
            "https://feed2.example.com/rss",
        ])

    assert len(result) == 2
    titles = {p.title for p in result}
    assert "Feed1 Article" in titles
    assert "Feed2 Article" in titles


@pytest.mark.asyncio
async def test_fetch_posts_second_feed_fails_first_succeeds():
    """Even if one feed fails, results from the successful feed are returned."""
    entry = _make_entry(title="Good Article", link="https://good.com/article")
    feed_ok = _make_feed([entry])

    client = RssFeedClient()

    call_count = 0

    async def get_side_effect(url, **kwargs):
        nonlocal call_count
        call_count += 1
        mock = MagicMock()
        if call_count == 1:
            mock.raise_for_status = MagicMock()
            mock.text = ""
            return mock
        else:
            raise Exception("Connection refused")

    with (
        patch("outbound.rss.client.httpx.AsyncClient") as mock_cls,
        patch("outbound.rss.client.feedparser.parse", return_value=feed_ok),
    ):
        mock_http = AsyncMock()
        mock_http.get = AsyncMock(side_effect=get_side_effect)
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_posts([
            "https://good.example.com/rss",
            "https://bad.example.com/rss",
        ])

    assert len(result) == 1
    assert result[0].title == "Good Article"


@pytest.mark.asyncio
async def test_fetch_posts_mixed_safe_and_unsafe_urls():
    """Unsafe URLs are skipped, safe ones are fetched."""
    entry = _make_entry(title="Safe Article", link="https://safe.com/article")
    feed = _make_feed([entry])

    client = RssFeedClient()
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.text = ""

    with (
        patch("outbound.rss.client.httpx.AsyncClient") as mock_cls,
        patch("outbound.rss.client.feedparser.parse", return_value=feed),
    ):
        mock_http = AsyncMock()
        mock_http.get = AsyncMock(return_value=mock_resp)
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await client.fetch_posts([
            "http://localhost/feed",          # unsafe — skipped
            "https://safe.example.com/rss",  # safe — fetched
        ])

    # Only one GET should have been made (for the safe URL)
    mock_http.get.assert_called_once()
    assert len(result) == 1
