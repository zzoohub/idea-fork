from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from domain.brief.errors import BriefNotFoundError
from domain.rating.errors import RatingNotFoundError
from domain.rating.models import CreateRatingRequest, Rating, UpdateRatingRequest
from domain.rating.service import RatingService
from tests.conftest import make_brief


@pytest.mark.asyncio
async def test_create_rating_checks_brief_exists():
    brief_repo = AsyncMock()
    brief_repo.get_brief_by_id = AsyncMock(return_value=None)
    rating_repo = AsyncMock()
    svc = RatingService(rating_repo, brief_repo)

    req = CreateRatingRequest(brief_id=99, session_id="s1", is_positive=True)
    with pytest.raises(BriefNotFoundError):
        await svc.create_rating(req)


@pytest.mark.asyncio
async def test_create_rating_success():
    brief = make_brief()
    rating = Rating(id=1, brief_id=1, is_positive=True, feedback=None, created_at=datetime(2026, 1, 1, tzinfo=timezone.utc))
    brief_repo = AsyncMock()
    brief_repo.get_brief_by_id = AsyncMock(return_value=brief)
    rating_repo = AsyncMock()
    rating_repo.create_rating = AsyncMock(return_value=rating)
    svc = RatingService(rating_repo, brief_repo)

    req = CreateRatingRequest(brief_id=1, session_id="s1", is_positive=True)
    result = await svc.create_rating(req)
    assert result.is_positive is True


@pytest.mark.asyncio
async def test_update_rating_not_found():
    brief = make_brief()
    brief_repo = AsyncMock()
    brief_repo.get_brief_by_id = AsyncMock(return_value=brief)
    rating_repo = AsyncMock()
    rating_repo.update_rating = AsyncMock(return_value=None)
    svc = RatingService(rating_repo, brief_repo)

    req = UpdateRatingRequest(brief_id=1, session_id="s1", is_positive=False)
    with pytest.raises(RatingNotFoundError):
        await svc.update_rating(req)


@pytest.mark.asyncio
async def test_update_rating_brief_not_found_raises():
    brief_repo = AsyncMock()
    brief_repo.get_brief_by_id = AsyncMock(return_value=None)
    rating_repo = AsyncMock()
    svc = RatingService(rating_repo, brief_repo)

    req = UpdateRatingRequest(brief_id=99, session_id="s1", is_positive=True)
    with pytest.raises(BriefNotFoundError):
        await svc.update_rating(req)
    rating_repo.update_rating.assert_not_called()


@pytest.mark.asyncio
async def test_update_rating_success():
    brief = make_brief()
    rating = Rating(
        id=1,
        brief_id=1,
        is_positive=False,
        feedback="Good one",
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    brief_repo = AsyncMock()
    brief_repo.get_brief_by_id = AsyncMock(return_value=brief)
    rating_repo = AsyncMock()
    rating_repo.update_rating = AsyncMock(return_value=rating)
    svc = RatingService(rating_repo, brief_repo)

    req = UpdateRatingRequest(brief_id=1, session_id="s1", is_positive=False, feedback="Good one")
    result = await svc.update_rating(req)
    assert result.is_positive is False
    assert result.feedback == "Good one"
