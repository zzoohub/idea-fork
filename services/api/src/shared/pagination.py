import base64
import json
from typing import Any

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
