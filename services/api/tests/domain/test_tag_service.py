from unittest.mock import AsyncMock

import pytest

from domain.tag.service import TagService
from tests.conftest import make_tag


@pytest.mark.asyncio
async def test_list_tags_delegates_to_repo():
    repo = AsyncMock()
    repo.list_tags = AsyncMock(return_value=[make_tag(1), make_tag(2, slug="fintech", name="Fintech")])
    svc = TagService(repo)

    result = await svc.list_tags()
    assert len(result) == 2
    repo.list_tags.assert_called_once_with()


@pytest.mark.asyncio
async def test_list_tags_empty():
    repo = AsyncMock()
    repo.list_tags = AsyncMock(return_value=[])
    svc = TagService(repo)

    result = await svc.list_tags()
    assert result == []
