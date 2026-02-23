"""Tests for outbound/postgres/post_repository.py."""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from domain.post.models import Post, PostListParams
from outbound.postgres.post_repository import PostgresPostRepository
from shared.pagination import encode_cursor


def _make_tag_row(id=1, slug="saas", name="SaaS"):
    row = MagicMock()
    row.id = id
    row.slug = slug
    row.name = name
    return row


def _make_post_row(
    id=1,
    title="Test Post",
    body="Body text",
    source="reddit",
    subreddit="python",
    external_url="https://reddit.com/1",
    external_created_at=None,
    score=50,
    num_comments=10,
    post_type="complaint",
    sentiment="negative",
    tags=None,
):
    row = MagicMock()
    row.id = id
    row.title = title
    row.body = body
    row.source = source
    row.subreddit = subreddit
    row.external_url = external_url
    row.external_created_at = external_created_at or datetime(2026, 2, 18, tzinfo=timezone.utc)
    row.score = score
    row.num_comments = num_comments
    row.post_type = post_type
    row.sentiment = sentiment
    row.tags = tags if tags is not None else [_make_tag_row()]
    return row


def _make_mock_db(rows):
    """Scalars with .unique().all() chain."""
    mock_scalars = MagicMock()
    mock_scalars.unique.return_value.all.return_value = rows
    mock_scalars.first.return_value = rows[0] if rows else None

    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    mock_db = MagicMock()
    mock_db.session.return_value = mock_session
    return mock_db


# ---------------------------------------------------------------------------
# list_posts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_posts_default_params():
    rows = [_make_post_row(1), _make_post_row(2)]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    params = PostListParams()
    result = await repo.list_posts(params)

    assert len(result) == 2
    assert all(isinstance(p, Post) for p in result)


@pytest.mark.asyncio
async def test_list_posts_sort_score():
    rows = [_make_post_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    params = PostListParams(sort="-score")
    result = await repo.list_posts(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_posts_sort_num_comments():
    rows = [_make_post_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    params = PostListParams(sort="-num_comments")
    result = await repo.list_posts(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_posts_with_cursor():
    rows = [_make_post_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    cursor = encode_cursor({"v": "2026-02-18T00:00:00+00:00", "id": 5})
    params = PostListParams(cursor=cursor)
    result = await repo.list_posts(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_posts_filter_by_tag():
    rows = [_make_post_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    params = PostListParams(tag="saas")
    result = await repo.list_posts(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_posts_filter_by_multiple_tags():
    rows = [_make_post_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    params = PostListParams(tag="saas,fintech")
    result = await repo.list_posts(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_posts_filter_by_source():
    rows = [_make_post_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    params = PostListParams(source="reddit")
    result = await repo.list_posts(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_posts_filter_by_subreddit():
    rows = [_make_post_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    params = PostListParams(subreddit="python")
    result = await repo.list_posts(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_posts_filter_by_sentiment():
    rows = [_make_post_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    params = PostListParams(sentiment="negative")
    result = await repo.list_posts(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_posts_filter_by_product():
    rows = [_make_post_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    params = PostListParams(product="notion")
    result = await repo.list_posts(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_posts_filter_by_q():
    rows = [_make_post_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    params = PostListParams(q="search term")
    result = await repo.list_posts(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_posts_filter_by_post_type():
    """Passing post_type should apply a post_type equality filter."""
    rows = [_make_post_row(1, post_type="complaint")]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    params = PostListParams(post_type="complaint")
    result = await repo.list_posts(params)
    assert len(result) == 1
    assert result[0].post_type == "complaint"


@pytest.mark.asyncio
async def test_list_posts_all_filters_combined():
    rows = [_make_post_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresPostRepository(mock_db)

    cursor = encode_cursor({"v": "2026-02-18T00:00:00+00:00", "id": 5})
    params = PostListParams(
        cursor=cursor,
        tag="saas",
        source="reddit",
        subreddit="python",
        sentiment="negative",
        product="notion",
        q="search",
    )
    result = await repo.list_posts(params)
    assert len(result) == 1


# ---------------------------------------------------------------------------
# get_post
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_post_found():
    row = _make_post_row(id=42)
    mock_db = _make_mock_db([row])
    repo = PostgresPostRepository(mock_db)

    result = await repo.get_post(42)

    assert result is not None
    assert isinstance(result, Post)
    assert result.id == 42


@pytest.mark.asyncio
async def test_get_post_not_found():
    mock_db = _make_mock_db([])
    repo = PostgresPostRepository(mock_db)

    result = await repo.get_post(99999)

    assert result is None


# ---------------------------------------------------------------------------
# _apply_cursor — None vs provided
# ---------------------------------------------------------------------------

def test_apply_cursor_none_returns_stmt():
    repo = PostgresPostRepository(MagicMock())
    stmt = MagicMock()
    result = repo._apply_cursor(stmt, None, MagicMock())
    assert result is stmt


def test_apply_cursor_with_value_calls_where():
    from outbound.postgres.models import PostRow

    repo = PostgresPostRepository(MagicMock())
    stmt = MagicMock()
    stmt.where = MagicMock(return_value=stmt)
    cursor = encode_cursor({"v": "2026-02-18T00:00:00+00:00", "id": 10})
    result = repo._apply_cursor(stmt, cursor, PostRow.external_created_at)
    stmt.where.assert_called_once()
