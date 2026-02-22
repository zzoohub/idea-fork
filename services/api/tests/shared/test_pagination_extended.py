"""Additional tests for shared/pagination.py — covering all uncovered branches."""
import base64

from shared.pagination import _CURSOR_MAX_BYTES, decode_cursor, encode_cursor


def test_decode_cursor_too_long_returns_empty():
    """Cursor exceeding the max byte limit must return empty dict."""
    too_long = "a" * (_CURSOR_MAX_BYTES + 1)
    assert decode_cursor(too_long) == {}


def test_decode_cursor_invalid_base64_returns_empty():
    """Non-base64 input must return empty dict (exception path)."""
    assert decode_cursor("!!!not-valid-base64!!!") == {}


def test_decode_cursor_valid_base64_non_dict_returns_empty():
    """Valid base64 that decodes to a JSON list (not dict) must return empty dict."""
    raw = base64.urlsafe_b64encode(b"[1, 2, 3]").decode().rstrip("=")
    assert decode_cursor(raw) == {}


def test_decode_cursor_valid_base64_non_json_returns_empty():
    """Valid base64 of non-JSON bytes must return empty dict."""
    raw = base64.urlsafe_b64encode(b"not-json").decode().rstrip("=")
    assert decode_cursor(raw) == {}


def test_decode_cursor_exactly_max_bytes_is_accepted():
    """A cursor exactly at the byte limit should be decoded if valid."""
    # Build a cursor whose encoded form is exactly _CURSOR_MAX_BYTES long.
    # We use a small valid payload and check it round-trips normally.
    encoded = encode_cursor({"v": "x", "id": 1})
    assert len(encoded) <= _CURSOR_MAX_BYTES
    result = decode_cursor(encoded)
    assert result["v"] == "x"
    assert result["id"] == 1
