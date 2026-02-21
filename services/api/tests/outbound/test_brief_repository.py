"""Tests for outbound/postgres/brief_repository.py."""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from domain.brief.models import Brief, BriefListParams
from outbound.postgres.brief_repository import PostgresBriefRepository
from shared.pagination import encode_cursor


def _make_brief_row(
    id=1,
    slug="test-brief",
    title="Test Brief",
    summary="Summary",
    problem_statement="Problem",
    opportunity="Opportunity",
    status="published",
    source_count=10,
    upvote_count=5,
    downvote_count=1,
    published_at=None,
    demand_signals=None,
    solution_directions=None,
    source_snapshots=None,
):
    row = MagicMock()
    row.id = id
    row.slug = slug
    row.title = title
    row.summary = summary
    row.problem_statement = problem_statement
    row.opportunity = opportunity
    row.status = status
    row.source_count = source_count
    row.upvote_count = upvote_count
    row.downvote_count = downvote_count
    row.published_at = published_at or datetime(2026, 2, 19, tzinfo=timezone.utc)
    row.demand_signals = demand_signals if demand_signals is not None else {}
    row.solution_directions = solution_directions if solution_directions is not None else []
    row.source_snapshots = source_snapshots if source_snapshots is not None else []
    return row


def _make_mock_db_for_scalars(rows):
    """Returns a mock DB where session.execute().scalars().all() yields rows."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = rows
    mock_result.scalars.return_value.first.return_value = rows[0] if rows else None

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    mock_db = MagicMock()
    mock_db.session.return_value = mock_session
    return mock_db


# ---------------------------------------------------------------------------
# list_briefs
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_briefs_returns_list():
    rows = [_make_brief_row(1), _make_brief_row(2, slug="brief-2")]
    mock_db = _make_mock_db_for_scalars(rows)
    repo = PostgresBriefRepository(mock_db)

    params = BriefListParams(sort="-published_at", limit=20)
    result = await repo.list_briefs(params)

    assert len(result) == 2
    assert all(isinstance(b, Brief) for b in result)


@pytest.mark.asyncio
async def test_list_briefs_with_cursor():
    rows = [_make_brief_row(1)]
    mock_db = _make_mock_db_for_scalars(rows)
    repo = PostgresBriefRepository(mock_db)

    cursor = encode_cursor({"v": "2026-02-19T00:00:00+00:00", "id": 5})
    params = BriefListParams(sort="-published_at", limit=20, cursor=cursor)
    result = await repo.list_briefs(params)

    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_briefs_sort_upvote_count():
    rows = [_make_brief_row(1)]
    mock_db = _make_mock_db_for_scalars(rows)
    repo = PostgresBriefRepository(mock_db)

    params = BriefListParams(sort="-upvote_count", limit=10)
    result = await repo.list_briefs(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_briefs_sort_source_count():
    rows = [_make_brief_row(1)]
    mock_db = _make_mock_db_for_scalars(rows)
    repo = PostgresBriefRepository(mock_db)

    params = BriefListParams(sort="-source_count", limit=10)
    result = await repo.list_briefs(params)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_list_briefs_no_cursor():
    rows = [_make_brief_row(1)]
    mock_db = _make_mock_db_for_scalars(rows)
    repo = PostgresBriefRepository(mock_db)

    params = BriefListParams(sort="-published_at", limit=20, cursor=None)
    result = await repo.list_briefs(params)
    assert len(result) == 1


# ---------------------------------------------------------------------------
# get_brief_by_slug
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_brief_by_slug_found():
    row = _make_brief_row(slug="my-brief")
    mock_db = _make_mock_db_for_scalars([row])
    repo = PostgresBriefRepository(mock_db)

    result = await repo.get_brief_by_slug("my-brief")

    assert result is not None
    assert isinstance(result, Brief)
    assert result.slug == "my-brief"


@pytest.mark.asyncio
async def test_get_brief_by_slug_not_found():
    mock_db = _make_mock_db_for_scalars([])
    repo = PostgresBriefRepository(mock_db)

    result = await repo.get_brief_by_slug("nonexistent")

    assert result is None


# ---------------------------------------------------------------------------
# get_brief_by_id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_brief_by_id_found():
    row = _make_brief_row(id=42)
    mock_db = _make_mock_db_for_scalars([row])
    repo = PostgresBriefRepository(mock_db)

    result = await repo.get_brief_by_id(42)

    assert result is not None
    assert isinstance(result, Brief)
    assert result.id == 42


@pytest.mark.asyncio
async def test_get_brief_by_id_not_found():
    mock_db = _make_mock_db_for_scalars([])
    repo = PostgresBriefRepository(mock_db)

    result = await repo.get_brief_by_id(99999)

    assert result is None


# ---------------------------------------------------------------------------
# _apply_cursor — both branches (None cursor vs. provided cursor)
# ---------------------------------------------------------------------------

def test_apply_cursor_with_none_returns_stmt_unchanged():
    """When cursor is None, _apply_cursor should return stmt as-is."""
    repo = PostgresBriefRepository(MagicMock())
    stmt = MagicMock()
    result = repo._apply_cursor(stmt, None, MagicMock())
    assert result is stmt


def test_apply_cursor_with_value_calls_where():
    """When cursor is provided, _apply_cursor should apply a where clause."""
    from outbound.postgres.models import BriefRow

    repo = PostgresBriefRepository(MagicMock())
    stmt = MagicMock()
    stmt.where = MagicMock(return_value=stmt)
    cursor = encode_cursor({"v": "2026-02-19T00:00:00+00:00", "id": 10})
    result = repo._apply_cursor(stmt, cursor, BriefRow.published_at)
    stmt.where.assert_called_once()
