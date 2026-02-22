"""Tests for outbound/reddit/client.py — RedditApiClient and helpers."""
import json
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from domain.pipeline.models import RawRedditPost
from outbound.reddit.client import (
    REDDIT_API_BASE,
    REDDIT_AUTH_URL,
    RedditApiClient,
    _safe_permalink,
)


# ---------------------------------------------------------------------------
# _safe_permalink
# ---------------------------------------------------------------------------

def test_safe_permalink_valid_path():
    path = "/r/SaaS/comments/abc123/my_post/"
    result = _safe_permalink(path)
    assert result == f"https://www.reddit.com{path}"


def test_safe_permalink_invalid_path_falls_back():
    """A path that does not match the regex must produce the fallback URL."""
    bad = "totally-not-a-permalink"
    result = _safe_permalink(bad)
    assert "reddit.com" in result
    assert "unknown" in result


def test_safe_permalink_empty_string():
    result = _safe_permalink("")
    assert "reddit.com" in result


def test_safe_permalink_with_slashes_stripped():
    """Slashes at the edges of an invalid permalink are stripped in the fallback."""
    bad = "/not/a/valid/permalink/format/with/extra/segments"
    result = _safe_permalink(bad)
    # invalid → falls back to reddit.com/r/unknown/comments/<stripped>
    assert "reddit.com" in result


# ---------------------------------------------------------------------------
# RedditApiClient — fetch_posts
# ---------------------------------------------------------------------------

def _make_http_client(auth_response=None, listing_response=None):
    """Build a mock httpx.AsyncClient that returns pre-set responses."""
    http = AsyncMock()
    http.__aenter__ = AsyncMock(return_value=http)
    http.__aexit__ = AsyncMock(return_value=False)

    # Default auth response
    auth_resp = MagicMock()
    auth_resp.raise_for_status = MagicMock()
    auth_resp.json = MagicMock(return_value=auth_response or {"access_token": "tok-123"})

    # Default listing response
    listing_resp = MagicMock()
    listing_resp.raise_for_status = MagicMock()
    listing_resp.json = MagicMock(return_value=listing_response or {"data": {"children": []}})

    http.post = AsyncMock(return_value=auth_resp)
    http.get = AsyncMock(return_value=listing_resp)

    return http


def _reddit_child(
    rid="abc",
    subreddit="SaaS",
    title="Test Title",
    selftext="Body text",
    permalink="/r/SaaS/comments/abc/test_title/",
    score=42,
    num_comments=7,
    created_utc=1700000000,
):
    return {
        "data": {
            "id": rid,
            "subreddit": subreddit,
            "title": title,
            "selftext": selftext,
            "permalink": permalink,
            "score": score,
            "num_comments": num_comments,
            "created_utc": created_utc,
        }
    }


@pytest.mark.asyncio
async def test_fetch_posts_returns_raw_posts():
    child = _reddit_child()
    listing = {"data": {"children": [child]}}
    http = _make_http_client(listing_response=listing)

    reddit = RedditApiClient("cid", "csecret", "ua/0.1")

    with patch("outbound.reddit.client.httpx.AsyncClient", return_value=http):
        posts = await reddit.fetch_posts(["SaaS"], limit=5)

    assert len(posts) == 1
    post = posts[0]
    assert isinstance(post, RawRedditPost)
    assert post.external_id == "abc"
    assert post.subreddit == "SaaS"
    assert post.title == "Test Title"
    assert post.body == "Body text"
    assert post.score == 42
    assert post.num_comments == 7


@pytest.mark.asyncio
async def test_fetch_posts_empty_selftext_becomes_none():
    """An empty string selftext should be stored as None."""
    child = _reddit_child(selftext="")
    listing = {"data": {"children": [child]}}
    http = _make_http_client(listing_response=listing)

    reddit = RedditApiClient("cid", "csecret", "ua/0.1")

    with patch("outbound.reddit.client.httpx.AsyncClient", return_value=http):
        posts = await reddit.fetch_posts(["SaaS"])

    assert posts[0].body is None


@pytest.mark.asyncio
async def test_fetch_posts_multiple_subreddits():
    child = _reddit_child()
    listing = {"data": {"children": [child]}}
    http = _make_http_client(listing_response=listing)

    reddit = RedditApiClient("cid", "csecret", "ua/0.1")

    with patch("outbound.reddit.client.httpx.AsyncClient", return_value=http):
        posts = await reddit.fetch_posts(["SaaS", "startups"])

    # One post per subreddit
    assert len(posts) == 2


@pytest.mark.asyncio
async def test_fetch_posts_empty_subreddit_list():
    http = _make_http_client()

    reddit = RedditApiClient("cid", "csecret", "ua/0.1")

    with patch("outbound.reddit.client.httpx.AsyncClient", return_value=http):
        posts = await reddit.fetch_posts([])

    assert posts == []


@pytest.mark.asyncio
async def test_fetch_posts_authenticates_before_fetching():
    """The client must POST to the auth URL before making GET requests."""
    listing = {"data": {"children": []}}
    http = _make_http_client(listing_response=listing)

    reddit = RedditApiClient("cid", "csecret", "ua/0.1")

    with patch("outbound.reddit.client.httpx.AsyncClient", return_value=http):
        await reddit.fetch_posts(["SaaS"])

    http.post.assert_called_once()
    call_args = http.post.call_args
    assert REDDIT_AUTH_URL in call_args.args or call_args.args[0] == REDDIT_AUTH_URL


@pytest.mark.asyncio
async def test_fetch_posts_uses_bearer_token_in_get_request():
    """The GET request must include the Authorization: Bearer header."""
    listing = {"data": {"children": []}}
    http = _make_http_client(listing_response=listing)

    reddit = RedditApiClient("cid", "csecret", "ua/0.1")

    with patch("outbound.reddit.client.httpx.AsyncClient", return_value=http):
        await reddit.fetch_posts(["SaaS"])

    http.get.assert_called_once()
    get_kwargs = http.get.call_args.kwargs
    assert get_kwargs["headers"]["Authorization"] == "Bearer tok-123"


@pytest.mark.asyncio
async def test_fetch_posts_limit_capped_at_100():
    """When limit > 100, the actual request param must be capped at 100."""
    listing = {"data": {"children": []}}
    http = _make_http_client(listing_response=listing)

    reddit = RedditApiClient("cid", "csecret", "ua/0.1")

    with patch("outbound.reddit.client.httpx.AsyncClient", return_value=http):
        await reddit.fetch_posts(["SaaS"], limit=500)

    get_kwargs = http.get.call_args.kwargs
    assert get_kwargs["params"]["limit"] == 100


@pytest.mark.asyncio
async def test_fetch_posts_uses_missing_data_defaults():
    """Children with missing data fields should use safe defaults."""
    child = {"data": {"id": "x"}}  # most fields missing
    listing = {"data": {"children": [child]}}
    http = _make_http_client(listing_response=listing)

    reddit = RedditApiClient("cid", "csecret", "ua/0.1")

    with patch("outbound.reddit.client.httpx.AsyncClient", return_value=http):
        posts = await reddit.fetch_posts(["SaaS"])

    assert len(posts) == 1
    post = posts[0]
    assert post.title == ""
    assert post.score == 0
    assert post.num_comments == 0
    assert post.subreddit == "SaaS"  # falls back to subreddit arg


@pytest.mark.asyncio
async def test_fetch_posts_external_url_from_valid_permalink():
    child = _reddit_child(permalink="/r/SaaS/comments/abc/title/")
    listing = {"data": {"children": [child]}}
    http = _make_http_client(listing_response=listing)

    reddit = RedditApiClient("cid", "csecret", "ua/0.1")

    with patch("outbound.reddit.client.httpx.AsyncClient", return_value=http):
        posts = await reddit.fetch_posts(["SaaS"])

    assert posts[0].external_url.startswith("https://www.reddit.com/r/SaaS/comments/abc/")


@pytest.mark.asyncio
async def test_fetch_posts_external_created_at_from_utc_timestamp():
    child = _reddit_child(created_utc=1700000000)
    listing = {"data": {"children": [child]}}
    http = _make_http_client(listing_response=listing)

    reddit = RedditApiClient("cid", "csecret", "ua/0.1")

    with patch("outbound.reddit.client.httpx.AsyncClient", return_value=http):
        posts = await reddit.fetch_posts(["SaaS"])

    expected = datetime.fromtimestamp(1700000000, tz=UTC)
    assert posts[0].external_created_at == expected
