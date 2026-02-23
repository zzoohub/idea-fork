"""Tests for outbound/postgres/tag_repository.py."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from domain.tag.models import Tag
from outbound.postgres.tag_repository import PostgresTagRepository


def _make_mock_db(rows):
    """Build a mock Database that returns `rows` from scalars().all()."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = rows

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    mock_db = MagicMock()
    mock_db.session.return_value = mock_session
    return mock_db


def _make_tag_row(id=1, slug="saas", name="SaaS"):
    row = MagicMock()
    row.id = id
    row.slug = slug
    row.name = name
    return row


@pytest.mark.asyncio
async def test_list_tags_returns_all_tags():
    tag_rows = [_make_tag_row(1, "saas", "SaaS"), _make_tag_row(2, "fintech", "Fintech")]
    mock_db = _make_mock_db(tag_rows)
    repo = PostgresTagRepository(mock_db)

    result = await repo.list_tags()

    assert len(result) == 2
    assert all(isinstance(t, Tag) for t in result)
    assert result[0].slug == "saas"
    assert result[1].slug == "fintech"


@pytest.mark.asyncio
async def test_list_tags_returns_empty_list():
    mock_db = _make_mock_db([])
    repo = PostgresTagRepository(mock_db)

    result = await repo.list_tags()

    assert result == []


@pytest.mark.asyncio
async def test_list_trending_tags_returns_tags():
    tag_rows = [_make_tag_row(1, "complaint", "Complaint"), _make_tag_row(2, "saas", "SaaS")]

    # list_trending_tags returns (TagRow, count) tuples via result.all()
    mock_result = MagicMock()
    mock_result.all.return_value = [(tag_rows[0], 15), (tag_rows[1], 10)]

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    mock_db = MagicMock()
    mock_db.session.return_value = mock_session

    repo = PostgresTagRepository(mock_db)
    result = await repo.list_trending_tags(days=7, limit=10)

    assert len(result) == 2
    assert all(isinstance(t, Tag) for t in result)
    assert result[0].slug == "complaint"
    assert result[1].slug == "saas"


@pytest.mark.asyncio
async def test_list_trending_tags_returns_empty():
    mock_result = MagicMock()
    mock_result.all.return_value = []

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    mock_db = MagicMock()
    mock_db.session.return_value = mock_session

    repo = PostgresTagRepository(mock_db)
    result = await repo.list_trending_tags(days=30, limit=5)

    assert result == []
