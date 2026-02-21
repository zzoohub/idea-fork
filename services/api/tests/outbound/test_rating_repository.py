"""Tests for outbound/postgres/rating_repository.py."""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest
from sqlalchemy.exc import IntegrityError

from domain.rating.errors import DuplicateRatingError
from domain.rating.models import CreateRatingRequest, Rating, UpdateRatingRequest
from outbound.postgres.rating_repository import PostgresRatingRepository


def _make_rating_row(
    id=1,
    brief_id=1,
    is_positive=True,
    feedback=None,
    created_at=None,
    session_id="session-abc",
):
    row = MagicMock()
    row.id = id
    row.brief_id = brief_id
    row.is_positive = is_positive
    row.feedback = feedback
    row.created_at = created_at or datetime(2026, 2, 21, tzinfo=timezone.utc)
    row.session_id = session_id
    return row


def _make_mock_db_with_session(mock_session):
    """Wrap mock_session in a mock db."""
    mock_db = MagicMock()
    mock_db.session.return_value = mock_session
    return mock_db


def _make_session_with_begin():
    """Build an async mock session that supports `async with session.begin()`."""
    mock_begin_ctx = AsyncMock()
    mock_begin_ctx.__aenter__ = AsyncMock(return_value=None)
    mock_begin_ctx.__aexit__ = AsyncMock(return_value=False)

    mock_session = AsyncMock()
    mock_session.begin = MagicMock(return_value=mock_begin_ctx)
    mock_session.add = MagicMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    return mock_session


# ---------------------------------------------------------------------------
# create_rating
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_rating_upvote():
    """Creating a positive (upvote) rating inserts a row and increments upvote_count."""
    rating_row = _make_rating_row(is_positive=True)

    mock_session = _make_session_with_begin()
    mock_session.flush = AsyncMock()
    mock_session.execute = AsyncMock()

    mock_db = _make_mock_db_with_session(mock_session)

    with patch(
        "outbound.postgres.rating_repository.RatingRow",
        return_value=rating_row,
    ):
        repo = PostgresRatingRepository(mock_db)
        req = CreateRatingRequest(brief_id=1, session_id="session-abc", is_positive=True)
        result = await repo.create_rating(req)

    assert result.is_positive is True
    mock_session.flush.assert_called_once()
    mock_session.execute.assert_called_once()  # upvote_count update


@pytest.mark.asyncio
async def test_create_rating_downvote():
    """Creating a negative (downvote) rating inserts a row and increments downvote_count."""
    rating_row = _make_rating_row(is_positive=False)

    mock_session = _make_session_with_begin()
    mock_session.flush = AsyncMock()
    mock_session.execute = AsyncMock()

    mock_db = _make_mock_db_with_session(mock_session)

    with patch(
        "outbound.postgres.rating_repository.RatingRow",
        return_value=rating_row,
    ):
        repo = PostgresRatingRepository(mock_db)
        req = CreateRatingRequest(brief_id=1, session_id="session-abc", is_positive=False)
        result = await repo.create_rating(req)

    assert result.is_positive is False
    mock_session.execute.assert_called_once()  # downvote_count update


@pytest.mark.asyncio
async def test_create_rating_raises_duplicate_on_integrity_error():
    """An IntegrityError from flush should be converted to DuplicateRatingError."""
    mock_session = _make_session_with_begin()
    mock_session.flush = AsyncMock(
        side_effect=IntegrityError(None, None, Exception("unique constraint"))
    )

    mock_db = _make_mock_db_with_session(mock_session)

    with patch(
        "outbound.postgres.rating_repository.RatingRow",
        return_value=_make_rating_row(),
    ):
        repo = PostgresRatingRepository(mock_db)
        req = CreateRatingRequest(brief_id=1, session_id="session-abc", is_positive=True)

        with pytest.raises(DuplicateRatingError):
            await repo.create_rating(req)


# ---------------------------------------------------------------------------
# update_rating
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_rating_not_found_returns_none():
    """If no existing rating found, update_rating returns None."""
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = None
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars

    mock_session = _make_session_with_begin()
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_db = _make_mock_db_with_session(mock_session)

    repo = PostgresRatingRepository(mock_db)
    req = UpdateRatingRequest(brief_id=1, session_id="session-abc", is_positive=True)
    result = await repo.update_rating(req)

    assert result is None


@pytest.mark.asyncio
async def test_update_rating_same_vote_no_counter_adjustment():
    """Updating rating with same is_positive value should NOT adjust counters."""
    existing_row = _make_rating_row(is_positive=True)

    mock_scalars = MagicMock()
    mock_scalars.first.return_value = existing_row
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars

    mock_session = _make_session_with_begin()
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_db = _make_mock_db_with_session(mock_session)

    repo = PostgresRatingRepository(mock_db)
    req = UpdateRatingRequest(brief_id=1, session_id="session-abc", is_positive=True, feedback="Great")
    result = await repo.update_rating(req)

    assert result is not None
    # execute called once for the SELECT only (no counter update)
    mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_update_rating_flip_to_positive():
    """Flipping downvote -> upvote should update both counters."""
    existing_row = _make_rating_row(is_positive=False)

    mock_scalars = MagicMock()
    mock_scalars.first.return_value = existing_row
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars

    mock_session = _make_session_with_begin()
    # first call = SELECT, second call = UPDATE counters
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_db = _make_mock_db_with_session(mock_session)

    repo = PostgresRatingRepository(mock_db)
    req = UpdateRatingRequest(brief_id=1, session_id="session-abc", is_positive=True)
    result = await repo.update_rating(req)

    assert result is not None
    assert mock_session.execute.call_count == 2  # SELECT + UPDATE


@pytest.mark.asyncio
async def test_update_rating_flip_to_negative():
    """Flipping upvote -> downvote should update both counters."""
    existing_row = _make_rating_row(is_positive=True)

    mock_scalars = MagicMock()
    mock_scalars.first.return_value = existing_row
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars

    mock_session = _make_session_with_begin()
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_db = _make_mock_db_with_session(mock_session)

    repo = PostgresRatingRepository(mock_db)
    req = UpdateRatingRequest(brief_id=1, session_id="session-abc", is_positive=False)
    result = await repo.update_rating(req)

    assert result is not None
    assert mock_session.execute.call_count == 2  # SELECT + UPDATE
