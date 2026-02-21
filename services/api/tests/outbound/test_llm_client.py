"""Tests for outbound/llm/client.py — helper functions and parsing logic."""
import pytest

from outbound.llm.client import _post_to_prompt_item, _strip_code_fences
from tests.conftest import make_post


# ---------------------------------------------------------------------------
# _strip_code_fences
# ---------------------------------------------------------------------------


def test_strip_code_fences_plain_json():
    text = '{"key": "value"}'
    assert _strip_code_fences(text) == '{"key": "value"}'


def test_strip_code_fences_with_json_fence():
    text = "```json\n{\"key\": \"value\"}\n```"
    assert _strip_code_fences(text) == '{"key": "value"}'


def test_strip_code_fences_with_generic_fence():
    text = "```\n[1, 2, 3]\n```"
    assert _strip_code_fences(text) == "[1, 2, 3]"


def test_strip_code_fences_strips_outer_whitespace():
    text = "  \n  ```json\n{\"a\": 1}\n```  \n  "
    assert _strip_code_fences(text) == '{"a": 1}'


def test_strip_code_fences_no_fences_returns_stripped():
    text = "   plain text   "
    assert _strip_code_fences(text) == "plain text"


def test_strip_code_fences_multiline_json_in_fence():
    text = "```json\n{\n  \"foo\": \"bar\",\n  \"baz\": 42\n}\n```"
    result = _strip_code_fences(text)
    assert result == '{\n  "foo": "bar",\n  "baz": 42\n}'


def test_strip_code_fences_fence_without_newline():
    """Handle ```json{...}``` without newline after opening fence."""
    text = "```json\n[]\n```"
    assert _strip_code_fences(text) == "[]"


def test_strip_code_fences_empty_string():
    assert _strip_code_fences("") == ""


def test_strip_code_fences_only_whitespace():
    assert _strip_code_fences("   ") == ""


def test_strip_code_fences_array_in_fence():
    text = '```json\n[{"id": 1}, {"id": 2}]\n```'
    result = _strip_code_fences(text)
    assert result == '[{"id": 1}, {"id": 2}]'


def test_strip_code_fences_fence_with_trailing_content_in_inner():
    """Inner content preserves its own leading/trailing whitespace trimmed."""
    text = "```json\n  {\"x\": 1}  \n```"
    result = _strip_code_fences(text)
    assert result == '{"x": 1}'


# ---------------------------------------------------------------------------
# _post_to_prompt_item
# ---------------------------------------------------------------------------


def test_post_to_prompt_item_contains_id():
    post = make_post(id=42)
    result = _post_to_prompt_item(post)
    assert "[ID:42]" in result


def test_post_to_prompt_item_contains_subreddit():
    post = make_post(subreddit="startups")
    result = _post_to_prompt_item(post)
    assert "r/startups" in result


def test_post_to_prompt_item_contains_score():
    post = make_post(score=99)
    result = _post_to_prompt_item(post)
    assert "score:99" in result


def test_post_to_prompt_item_contains_num_comments():
    post = make_post(num_comments=17)
    result = _post_to_prompt_item(post)
    assert "comments:17" in result


def test_post_to_prompt_item_contains_title():
    post = make_post(title="My great complaint")
    result = _post_to_prompt_item(post)
    assert "My great complaint" in result


def test_post_to_prompt_item_contains_body_snippet():
    post = make_post(body="Short body text")
    result = _post_to_prompt_item(post)
    assert "Short body text" in result


def test_post_to_prompt_item_body_none_shows_empty():
    post = make_post(body=None)
    result = _post_to_prompt_item(post)
    # body=None should produce empty string snippet (not "None")
    assert "Body: " in result
    assert "None" not in result


def test_post_to_prompt_item_body_truncated_at_500_chars():
    long_body = "x" * 600
    post = make_post(body=long_body)
    result = _post_to_prompt_item(post)
    # Only first 500 chars of body should appear
    assert "x" * 500 in result
    assert "x" * 501 not in result


def test_post_to_prompt_item_body_exactly_500_chars_not_truncated():
    body = "a" * 500
    post = make_post(body=body)
    result = _post_to_prompt_item(post)
    assert "a" * 500 in result


def test_post_to_prompt_item_body_under_500_chars_fully_included():
    body = "b" * 100
    post = make_post(body=body)
    result = _post_to_prompt_item(post)
    assert "b" * 100 in result


def test_post_to_prompt_item_format_structure():
    post = make_post(id=1, subreddit="saas", score=10, num_comments=5, title="Title", body="Body")
    result = _post_to_prompt_item(post)
    lines = result.split("\n")
    # First line has the header with ID, subreddit, score, comments
    assert "[ID:1]" in lines[0]
    assert "r/saas" in lines[0]
    # Second line is the title
    assert "Title: Title" in lines[1]
    # Third line is the body
    assert "Body: Body" in lines[2]
