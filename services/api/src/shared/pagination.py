import base64
import json
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import DateTime, Numeric, Select, and_, or_
from sqlalchemy.orm import MappedColumn

# Cursors are base64-encoded JSON blobs generated server-side.
# 2 KB is a very generous upper bound; a real cursor is under 200 bytes.
_CURSOR_MAX_BYTES = 2048


def encode_cursor(values: dict[str, Any]) -> str:
    raw = json.dumps(values, default=str)
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def decode_cursor(cursor: str) -> dict[str, Any]:
    """Decode a pagination cursor.

    Returns an empty dict (which is treated as "no cursor" by callers) when
    the value cannot be decoded, preventing a malformed cursor from causing an
    unhandled 500 or being used to inject unexpected values into queries.
    """
    if len(cursor) > _CURSOR_MAX_BYTES:
        return {}
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        raw = base64.urlsafe_b64decode(padded.encode()).decode()
        result = json.loads(raw)
        if not isinstance(result, dict):
            return {}
        return result
    except Exception:
        return {}


def cast_cursor_value(value: Any, column: MappedColumn) -> Any:
    """Cast a JSON-decoded cursor value to the Python type expected by asyncpg.

    ``json.loads`` deserialises datetimes and decimals as plain strings, but
    asyncpg requires proper Python types for prepared-statement parameters.
    """
    if value is None:
        return None
    col_type = column.expression.type
    if isinstance(col_type, DateTime) and isinstance(value, str):
        return datetime.fromisoformat(value)
    if isinstance(col_type, Numeric) and isinstance(value, str):
        return Decimal(value)
    return value


def apply_cursor(
    stmt: Select, cursor: str | None, sort_col: MappedColumn, id_col: MappedColumn
) -> Select:
    """Apply keyset (cursor) pagination to a SQLAlchemy SELECT statement.

    Shared across repositories to avoid duplicating the same cursor logic.
    """
    if cursor is None:
        return stmt

    values = decode_cursor(cursor)
    cursor_sort_val = cast_cursor_value(values.get("v"), sort_col)
    cursor_id = values.get("id")

    return stmt.where(
        or_(
            sort_col < cursor_sort_val,
            and_(sort_col == cursor_sort_val, id_col < cursor_id),
        )
    )


@dataclass(frozen=True)
class Page[T]:
    items: list[T]
    has_next: bool
    next_cursor: str | None


def paginate(
    rows: list[Any],
    *,
    limit: int,
    sort_attr: str,
) -> Page:
    """Build a cursor-paginated page from over-fetched rows.

    Expects ``len(rows)`` to be ``limit + 1`` when there is a next page.
    """
    has_next = len(rows) > limit
    items = rows[:limit]

    next_cursor = None
    if has_next and items:
        last = items[-1]
        next_cursor = encode_cursor({"v": getattr(last, sort_attr), "id": last.id})

    return Page(items=items, has_next=has_next, next_cursor=next_cursor)
