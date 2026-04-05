from dataclasses import dataclass
from unittest.mock import MagicMock

from outbound.postgres.models import BriefRow, PostRow, ProductRow
from shared.pagination import apply_cursor, decode_cursor, encode_cursor, paginate


def test_encode_decode_roundtrip():
    values = {"v": "2026-02-18T14:22:00+00:00", "id": 456}
    encoded = encode_cursor(values)
    decoded = decode_cursor(encoded)
    assert decoded["v"] == "2026-02-18T14:22:00+00:00"
    assert decoded["id"] == 456


def test_encode_cursor_strips_padding():
    encoded = encode_cursor({"v": 1, "id": 2})
    assert "=" not in encoded


def test_decode_cursor_handles_missing_padding():
    encoded = encode_cursor({"v": 100, "id": 200})
    decoded = decode_cursor(encoded)
    assert decoded["v"] == 100
    assert decoded["id"] == 200


# ---------------------------------------------------------------------------
# apply_cursor
# ---------------------------------------------------------------------------

def test_apply_cursor_none_returns_stmt_unchanged():
    stmt = MagicMock()
    result = apply_cursor(stmt, None, BriefRow.published_at, BriefRow.id)
    assert result is stmt


def test_apply_cursor_with_datetime_value():
    stmt = MagicMock()
    stmt.where = MagicMock(return_value=stmt)
    cursor = encode_cursor({"v": "2026-02-19T00:00:00+00:00", "id": 10})
    result = apply_cursor(stmt, cursor, BriefRow.published_at, BriefRow.id)
    stmt.where.assert_called_once()


def test_apply_cursor_with_numeric_value():
    stmt = MagicMock()
    stmt.where = MagicMock(return_value=stmt)
    cursor = encode_cursor({"v": "8.5", "id": 10})
    result = apply_cursor(stmt, cursor, ProductRow.trending_score, ProductRow.id)
    stmt.where.assert_called_once()


def test_apply_cursor_with_post_column():
    stmt = MagicMock()
    stmt.where = MagicMock(return_value=stmt)
    cursor = encode_cursor({"v": "2026-02-18T00:00:00+00:00", "id": 10})
    result = apply_cursor(stmt, cursor, PostRow.external_created_at, PostRow.id)
    stmt.where.assert_called_once()


# ---------------------------------------------------------------------------
# paginate
# ---------------------------------------------------------------------------

@dataclass
class _FakeItem:
    id: int
    score: int


def test_paginate_no_next_page():
    items = [_FakeItem(id=1, score=10), _FakeItem(id=2, score=20)]
    page = paginate(items, limit=5, sort_attr="score")
    assert page.has_next is False
    assert page.next_cursor is None
    assert len(page.items) == 2


def test_paginate_with_next_page():
    items = [_FakeItem(id=i, score=i * 10) for i in range(1, 4)]
    page = paginate(items, limit=2, sort_attr="score")
    assert page.has_next is True
    assert page.next_cursor is not None
    assert len(page.items) == 2
    decoded = decode_cursor(page.next_cursor)
    assert decoded["v"] == 20
    assert decoded["id"] == 2


def test_paginate_empty_list():
    page = paginate([], limit=10, sort_attr="score")
    assert page.has_next is False
    assert page.next_cursor is None
    assert page.items == []
