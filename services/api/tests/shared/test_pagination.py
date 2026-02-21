from shared.pagination import decode_cursor, encode_cursor


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
