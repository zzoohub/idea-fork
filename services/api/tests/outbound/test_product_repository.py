"""Tests for outbound/postgres/product_repository.py."""
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from domain.post.models import Post
from domain.product.models import Product, ProductListParams
from outbound.postgres.product_repository import PostgresProductRepository
from shared.pagination import encode_cursor


def _make_product_row(
    id=1,
    slug="notion",
    name="Notion",
    source="producthunt",
    external_id="notion-1",
    tagline="One workspace. Every team.",
    description="A tool",
    url="https://notion.so",
    image_url=None,
    category="Productivity",
    launched_at=None,
    complaint_count=10,
    trending_score=Decimal("8.5000"),
):
    row = MagicMock()
    row.id = id
    row.slug = slug
    row.name = name
    row.source = source
    row.external_id = external_id
    row.tagline = tagline
    row.description = description
    row.url = url
    row.image_url = image_url
    row.category = category
    row.launched_at = launched_at
    row.complaint_count = complaint_count
    row.trending_score = trending_score
    return row


def _make_post_row(
    id=1,
    title="Post",
    body="Body",
    source="reddit",
    subreddit="python",
    external_url="https://reddit.com/1",
    score=50,
    num_comments=10,
    post_type="complaint",
    sentiment="negative",
    deleted_at=None,
):
    row = MagicMock()
    row.id = id
    row.title = title
    row.body = body
    row.source = source
    row.subreddit = subreddit
    row.external_url = external_url
    row.external_created_at = datetime(2026, 2, 18, tzinfo=timezone.utc)
    row.score = score
    row.num_comments = num_comments
    row.post_type = post_type
    row.sentiment = sentiment
    row.deleted_at = deleted_at
    row.tags = []
    return row


def _make_mock_db(rows):
    """Scalars with .all() and .first() chain."""
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = rows
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
# list_products
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_products_default_params():
    rows = [_make_product_row(1), _make_product_row(2, slug="slack")]
    mock_db = _make_mock_db(rows)
    repo = PostgresProductRepository(mock_db)

    params = ProductListParams()
    result = await repo.list_products(params)

    assert len(result) == 2
    assert all(isinstance(p, Product) for p in result)


@pytest.mark.asyncio
async def test_list_products_sort_complaint_count():
    rows = [_make_product_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresProductRepository(mock_db)

    params = ProductListParams(sort="-complaint_count")
    result = await repo.list_products(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_products_with_category_filter():
    rows = [_make_product_row(1, category="Productivity")]
    mock_db = _make_mock_db(rows)
    repo = PostgresProductRepository(mock_db)

    params = ProductListParams(category="Productivity")
    result = await repo.list_products(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_products_with_cursor():
    rows = [_make_product_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresProductRepository(mock_db)

    cursor = encode_cursor({"v": "8.5", "id": 5})
    params = ProductListParams(cursor=cursor)
    result = await repo.list_products(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_products_empty():
    mock_db = _make_mock_db([])
    repo = PostgresProductRepository(mock_db)

    params = ProductListParams()
    result = await repo.list_products(params)
    assert result == []


# ---------------------------------------------------------------------------
# get_product_by_slug
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_product_by_slug_found():
    row = _make_product_row(slug="notion")
    mock_db = _make_mock_db([row])
    repo = PostgresProductRepository(mock_db)

    result = await repo.get_product_by_slug("notion")

    assert result is not None
    assert isinstance(result, Product)
    assert result.slug == "notion"


@pytest.mark.asyncio
async def test_get_product_by_slug_not_found():
    mock_db = _make_mock_db([])
    repo = PostgresProductRepository(mock_db)

    result = await repo.get_product_by_slug("nonexistent")

    assert result is None


# ---------------------------------------------------------------------------
# get_product_posts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_product_posts_returns_list():
    post_rows = [_make_post_row(1), _make_post_row(2)]
    mock_db = _make_mock_db(post_rows)
    repo = PostgresProductRepository(mock_db)

    result = await repo.get_product_posts(product_id=1, limit=10)

    assert len(result) == 2
    assert all(isinstance(p, Post) for p in result)


@pytest.mark.asyncio
async def test_get_product_posts_empty():
    mock_db = _make_mock_db([])
    repo = PostgresProductRepository(mock_db)

    result = await repo.get_product_posts(product_id=1)
    assert result == []


# ---------------------------------------------------------------------------
# _apply_cursor — None vs provided
# ---------------------------------------------------------------------------

def test_apply_cursor_none_returns_stmt():
    repo = PostgresProductRepository(MagicMock())
    stmt = MagicMock()
    result = repo._apply_cursor(stmt, None, MagicMock())
    assert result is stmt


def test_apply_cursor_with_value_calls_where():
    from outbound.postgres.models import ProductRow

    repo = PostgresProductRepository(MagicMock())
    stmt = MagicMock()
    stmt.where = MagicMock(return_value=stmt)
    cursor = encode_cursor({"v": "8.5", "id": 10})
    result = repo._apply_cursor(stmt, cursor, ProductRow.trending_score)
    stmt.where.assert_called_once()
