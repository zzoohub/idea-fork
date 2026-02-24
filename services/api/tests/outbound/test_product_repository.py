"""Tests for outbound/postgres/product_repository.py."""
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from domain.post.models import Post
from domain.product.models import Product, ProductListParams, ProductMetrics
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
    signal_count=10,
    trending_score=Decimal("8.5000"),
    tags=None,
    sources=None,
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
    row.signal_count = signal_count
    row.trending_score = trending_score
    row.tags = tags if tags is not None else []
    row.sources = sources if sources is not None else [source]
    return row


def _make_metrics_result(total=5, negative=3, positive=1):
    """Build a mock row returned by the aggregation query for get_product_metrics."""
    row = MagicMock()
    row.total = total
    row.negative = negative
    row.positive = positive

    result = MagicMock()
    result.one.return_value = row
    return result


def _make_mock_db_for_metrics(metrics_result):
    """Mock Database whose session executes and returns a metrics aggregate row."""
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=metrics_result)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    mock_db = MagicMock()
    mock_db.session.return_value = mock_session
    return mock_db


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
    """Mock DB that supports both raw SQL (fetchall) and ORM (scalars) patterns.

    list_products uses raw SQL: result.fetchall() for products, then
    select(...) for tags per product.
    Other methods use ORM: result.scalars().all() / .first().
    """

    def _make_result(result_rows):
        r = MagicMock()
        r.fetchall.return_value = result_rows
        r.fetchone.return_value = result_rows[0] if result_rows else None
        r.__iter__ = lambda self: iter([])  # empty iteration for tag sub-queries

        mock_scalars = MagicMock()
        mock_scalars.all.return_value = result_rows
        mock_scalars.first.return_value = result_rows[0] if result_rows else None
        r.scalars.return_value = mock_scalars
        return r

    main_result = _make_result(rows)
    tag_result = MagicMock()
    tag_result.__iter__ = lambda self: iter([])

    call_count = 0

    async def mock_execute(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return main_result
        return tag_result

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=mock_execute)
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
async def test_list_products_sort_signal_count():
    rows = [_make_product_row(1)]
    mock_db = _make_mock_db(rows)
    repo = PostgresProductRepository(mock_db)

    params = ProductListParams(sort="-signal_count")
    result = await repo.list_products(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_products_sort_launched_at():
    rows = [_make_product_row(1, launched_at=datetime(2026, 1, 1, tzinfo=timezone.utc))]
    mock_db = _make_mock_db(rows)
    repo = PostgresProductRepository(mock_db)

    params = ProductListParams(sort="-launched_at")
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


# ---------------------------------------------------------------------------
# get_product_metrics
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_product_metrics_returns_correct_values():
    """Standard case: total=5, negative=3, positive=1 → sentiment_score=round(1/4*100)=25."""
    metrics_result = _make_metrics_result(total=5, negative=3, positive=1)
    mock_db = _make_mock_db_for_metrics(metrics_result)
    repo = PostgresProductRepository(mock_db)

    result = await repo.get_product_metrics(product_id=1)

    assert isinstance(result, ProductMetrics)
    assert result.total_mentions == 5
    assert result.negative_count == 3
    assert result.sentiment_score == 25  # round(1 / max(1+3, 1) * 100) = round(25.0)


@pytest.mark.asyncio
async def test_get_product_metrics_all_positive_gives_score_100():
    """When all posts are positive, sentiment_score should be 100."""
    metrics_result = _make_metrics_result(total=4, negative=0, positive=4)
    mock_db = _make_mock_db_for_metrics(metrics_result)
    repo = PostgresProductRepository(mock_db)

    result = await repo.get_product_metrics(product_id=2)

    assert result.total_mentions == 4
    assert result.negative_count == 0
    assert result.sentiment_score == 100  # round(4 / max(4+0, 1) * 100)


@pytest.mark.asyncio
async def test_get_product_metrics_all_negative_gives_score_0():
    """When all posts are negative, sentiment_score should be 0."""
    metrics_result = _make_metrics_result(total=3, negative=3, positive=0)
    mock_db = _make_mock_db_for_metrics(metrics_result)
    repo = PostgresProductRepository(mock_db)

    result = await repo.get_product_metrics(product_id=3)

    assert result.total_mentions == 3
    assert result.negative_count == 3
    assert result.sentiment_score == 0  # round(0 / max(0+3, 1) * 100)


@pytest.mark.asyncio
async def test_get_product_metrics_zero_posts_avoids_division_by_zero():
    """When both positive and negative are 0, max(0+0,1)=1 prevents ZeroDivisionError.
    sentiment_score should be 0 (round(0/1*100))."""
    metrics_result = _make_metrics_result(total=0, negative=0, positive=0)
    mock_db = _make_mock_db_for_metrics(metrics_result)
    repo = PostgresProductRepository(mock_db)

    result = await repo.get_product_metrics(product_id=4)

    assert result.total_mentions == 0
    assert result.negative_count == 0
    assert result.sentiment_score == 0  # round(0 / max(0+0, 1) * 100)


@pytest.mark.asyncio
async def test_get_product_metrics_mixed_sentiment_rounds_correctly():
    """Verify rounding: positive=1, negative=1 → score=round(1/2*100)=50."""
    metrics_result = _make_metrics_result(total=2, negative=1, positive=1)
    mock_db = _make_mock_db_for_metrics(metrics_result)
    repo = PostgresProductRepository(mock_db)

    result = await repo.get_product_metrics(product_id=5)

    assert result.total_mentions == 2
    assert result.negative_count == 1
    assert result.sentiment_score == 50  # round(1 / max(1+1, 1) * 100)
