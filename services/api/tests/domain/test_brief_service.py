from unittest.mock import AsyncMock

import pytest

from domain.brief.errors import BriefNotFoundError
from domain.brief.models import BriefListParams
from domain.brief.service import BriefService
from tests.conftest import make_brief


@pytest.mark.asyncio
async def test_list_briefs_delegates_to_repo():
    repo = AsyncMock()
    repo.list_briefs = AsyncMock(return_value=[make_brief(1), make_brief(2)])
    svc = BriefService(repo)

    params = BriefListParams()
    result = await svc.list_briefs(params)
    assert len(result) == 2
    repo.list_briefs.assert_called_once_with(params)


@pytest.mark.asyncio
async def test_get_brief_by_slug_found():
    brief = make_brief(slug="my-brief")
    repo = AsyncMock()
    repo.get_brief_by_slug = AsyncMock(return_value=brief)
    svc = BriefService(repo)

    result = await svc.get_brief_by_slug("my-brief")
    assert result.slug == "my-brief"
    repo.get_brief_by_slug.assert_called_once_with("my-brief")


@pytest.mark.asyncio
async def test_get_brief_by_slug_not_found_raises():
    repo = AsyncMock()
    repo.get_brief_by_slug = AsyncMock(return_value=None)
    svc = BriefService(repo)

    with pytest.raises(BriefNotFoundError) as exc_info:
        await svc.get_brief_by_slug("missing")
    assert "missing" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_brief_by_id_found():
    brief = make_brief(id=42)
    repo = AsyncMock()
    repo.get_brief_by_id = AsyncMock(return_value=brief)
    svc = BriefService(repo)

    result = await svc.get_brief_by_id(42)
    assert result.id == 42
    repo.get_brief_by_id.assert_called_once_with(42)


@pytest.mark.asyncio
async def test_get_brief_by_id_not_found_raises():
    repo = AsyncMock()
    repo.get_brief_by_id = AsyncMock(return_value=None)
    svc = BriefService(repo)

    with pytest.raises(BriefNotFoundError) as exc_info:
        await svc.get_brief_by_id(99)
    assert "99" in str(exc_info.value)
