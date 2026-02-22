"""Tests for AnthropicLlmClient — tag_posts, cluster_posts, synthesize_brief.

All tests mock the Anthropic API client so no network calls are made.
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from domain.pipeline.models import BriefDraft, ClusteringResult, TaggingResult
from outbound.llm.client import AnthropicLlmClient
from tests.conftest import make_post


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_client() -> AnthropicLlmClient:
    """Return an AnthropicLlmClient with a mocked underlying Anthropic client."""
    with patch("outbound.llm.client.anthropic.AsyncAnthropic"):
        client = AnthropicLlmClient(
            api_key="sk-test",
            tagging_model="claude-haiku",
            synthesis_model="claude-sonnet",
        )
    return client


def _make_message(content: str) -> MagicMock:
    msg = MagicMock()
    msg.content = [MagicMock(text=content)]
    return msg


# ---------------------------------------------------------------------------
# Constructor
# ---------------------------------------------------------------------------

def test_constructor_stores_models():
    with patch("outbound.llm.client.anthropic.AsyncAnthropic"):
        client = AnthropicLlmClient(
            api_key="sk-key",
            tagging_model="model-a",
            synthesis_model="model-b",
        )
    assert client._tagging_model == "model-a"
    assert client._synthesis_model == "model-b"


# ---------------------------------------------------------------------------
# tag_posts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_tag_posts_returns_tagging_results():
    posts = [make_post(id=1), make_post(id=2)]
    payload = json.dumps([
        {"post_id": 1, "post_type": "complaint", "sentiment": "negative", "tag_slugs": ["saas"]},
        {"post_id": 2, "post_type": "feature_request", "sentiment": "neutral", "tag_slugs": ["developer-tools"]},
    ])
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(payload))

    results = await client.tag_posts(posts)

    assert len(results) == 2
    assert isinstance(results[0], TaggingResult)
    assert results[0].post_id == 1
    assert results[0].post_type == "complaint"
    assert results[0].sentiment == "negative"
    assert results[0].tag_slugs == ["saas"]


@pytest.mark.asyncio
async def test_tag_posts_unknown_post_id_is_skipped():
    """LLM returning an unknown post_id should be silently ignored."""
    posts = [make_post(id=5)]
    payload = json.dumps([
        {"post_id": 999, "post_type": "complaint", "sentiment": "negative", "tag_slugs": []},
    ])
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(payload))

    results = await client.tag_posts(posts)

    assert results == []


@pytest.mark.asyncio
async def test_tag_posts_invalid_post_type_defaults_to_other():
    posts = [make_post(id=1)]
    payload = json.dumps([
        {"post_id": 1, "post_type": "INVALID_TYPE", "sentiment": "positive", "tag_slugs": []},
    ])
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(payload))

    results = await client.tag_posts(posts)

    assert results[0].post_type == "other"


@pytest.mark.asyncio
async def test_tag_posts_invalid_sentiment_defaults_to_neutral():
    posts = [make_post(id=1)]
    payload = json.dumps([
        {"post_id": 1, "post_type": "question", "sentiment": "INVALID", "tag_slugs": []},
    ])
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(payload))

    results = await client.tag_posts(posts)

    assert results[0].sentiment == "neutral"


@pytest.mark.asyncio
async def test_tag_posts_invalid_tag_slugs_are_filtered():
    """Tag slugs that do not match the slug regex should be dropped."""
    posts = [make_post(id=1)]
    payload = json.dumps([
        {
            "post_id": 1,
            "post_type": "complaint",
            "sentiment": "negative",
            "tag_slugs": ["valid-slug", "INVALID SLUG!", 42, ""],
        },
    ])
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(payload))

    results = await client.tag_posts(posts)

    assert results[0].tag_slugs == ["valid-slug"]


@pytest.mark.asyncio
async def test_tag_posts_tag_slugs_truncated_at_10():
    """More than 10 tag slugs should be capped at 10."""
    posts = [make_post(id=1)]
    slugs = [f"slug-{i:02d}" for i in range(15)]  # 15 valid slugs
    payload = json.dumps([
        {"post_id": 1, "post_type": "other", "sentiment": "neutral", "tag_slugs": slugs},
    ])
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(payload))

    results = await client.tag_posts(posts)

    assert len(results[0].tag_slugs) == 10


@pytest.mark.asyncio
async def test_tag_posts_uses_tagging_model():
    posts = [make_post(id=1)]
    payload = json.dumps([
        {"post_id": 1, "post_type": "other", "sentiment": "neutral", "tag_slugs": []},
    ])
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(payload))

    await client.tag_posts(posts)

    call_kwargs = client._client.messages.create.call_args
    assert call_kwargs.kwargs["model"] == "claude-haiku"


@pytest.mark.asyncio
async def test_tag_posts_missing_fields_use_defaults():
    """Items missing post_type/sentiment/tag_slugs should use safe defaults."""
    posts = [make_post(id=1)]
    payload = json.dumps([{"post_id": 1}])
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(payload))

    results = await client.tag_posts(posts)

    assert results[0].post_type == "other"
    assert results[0].sentiment == "neutral"
    assert results[0].tag_slugs == []


# ---------------------------------------------------------------------------
# cluster_posts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cluster_posts_returns_clustering_results():
    posts = [make_post(id=1), make_post(id=2)]
    payload = json.dumps([
        {"label": "Pricing issues", "summary": "Users unhappy about pricing.", "post_ids": [1, 2]},
    ])
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(payload))

    results = await client.cluster_posts(posts)

    assert len(results) == 1
    assert isinstance(results[0], ClusteringResult)
    assert results[0].label == "Pricing issues"
    assert results[0].post_ids == [1, 2]


@pytest.mark.asyncio
async def test_cluster_posts_multiple_clusters():
    posts = [make_post(id=i) for i in range(4)]
    payload = json.dumps([
        {"label": "Cluster A", "summary": "Summary A", "post_ids": [0, 1]},
        {"label": "Cluster B", "summary": "Summary B", "post_ids": [2, 3]},
    ])
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(payload))

    results = await client.cluster_posts(posts)

    assert len(results) == 2
    assert results[1].label == "Cluster B"


@pytest.mark.asyncio
async def test_cluster_posts_uses_synthesis_model():
    posts = [make_post(id=1)]
    payload = json.dumps([{"label": "X", "summary": "Y", "post_ids": [1]}])
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(payload))

    await client.cluster_posts(posts)

    call_kwargs = client._client.messages.create.call_args
    assert call_kwargs.kwargs["model"] == "claude-sonnet"


@pytest.mark.asyncio
async def test_cluster_posts_with_fenced_response():
    """cluster_posts should correctly strip code fences from the LLM response."""
    posts = [make_post(id=1)]
    inner = json.dumps([{"label": "X", "summary": "Y", "post_ids": [1]}])
    fenced = f"```json\n{inner}\n```"
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(fenced))

    results = await client.cluster_posts(posts)

    assert len(results) == 1


# ---------------------------------------------------------------------------
# synthesize_brief
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_synthesize_brief_returns_brief_draft():
    posts = [make_post(id=1)]
    data = {
        "title": "Better Pricing Transparency",
        "slug": "better-pricing-transparency",
        "summary": "Summary text.",
        "problem_statement": "Users complain about opaque pricing.",
        "opportunity": "Clear pricing pages.",
        "solution_directions": ["Direction 1", "Direction 2"],
        "demand_signals": {"post_count": 5, "subreddit_count": 2, "avg_score": 100.0, "total_comments": 30},
        "source_snapshots": [{"post_id": 1, "title": "T", "snippet": "S", "external_url": "https://example.com", "subreddit": "SaaS", "score": 50}],
        "source_post_ids": [1],
    }
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(json.dumps(data)))

    result = await client.synthesize_brief(label="Pricing", summary="Pricing issues", posts=posts)

    assert isinstance(result, BriefDraft)
    assert result.title == "Better Pricing Transparency"
    assert result.slug == "better-pricing-transparency"
    assert result.source_post_ids == [1]


@pytest.mark.asyncio
async def test_synthesize_brief_uses_synthesis_model():
    posts = [make_post(id=1)]
    data = {
        "title": "T",
        "slug": "t",
        "summary": "S",
        "problem_statement": "P",
        "opportunity": "O",
        "solution_directions": [],
        "demand_signals": {},
        "source_snapshots": [],
        "source_post_ids": [],
    }
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(json.dumps(data)))

    await client.synthesize_brief(label="L", summary="S", posts=posts)

    call_kwargs = client._client.messages.create.call_args
    assert call_kwargs.kwargs["model"] == "claude-sonnet"


@pytest.mark.asyncio
async def test_synthesize_brief_with_fenced_response():
    posts = [make_post(id=1)]
    data = {
        "title": "T",
        "slug": "t",
        "summary": "S",
        "problem_statement": "P",
        "opportunity": "O",
        "solution_directions": ["D1"],
        "demand_signals": {"post_count": 1},
        "source_snapshots": [],
        "source_post_ids": [1],
    }
    fenced = f"```json\n{json.dumps(data)}\n```"
    client = _make_client()
    client._client.messages.create = AsyncMock(return_value=_make_message(fenced))

    result = await client.synthesize_brief(label="L", summary="S", posts=posts)

    assert result.title == "T"
