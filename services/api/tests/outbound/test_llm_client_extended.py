"""Tests for GeminiLlmClient — tag_posts, cluster_posts, synthesize_brief.

All tests mock the Gemini API client so no network calls are made.
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from domain.pipeline.models import BriefDraft, ClusteringResult, RawProduct, TaggingResult
from outbound.llm.client import GeminiLlmClient
from tests.conftest import make_post


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_client() -> GeminiLlmClient:
    """Return a GeminiLlmClient with a mocked underlying genai client."""
    with patch("outbound.llm.client.genai.Client"):
        client = GeminiLlmClient(api_key="test-key", model="gemini-2.5-flash")
    return client


def _make_response(content: str) -> MagicMock:
    resp = MagicMock()
    resp.text = content
    return resp


# ---------------------------------------------------------------------------
# Constructor
# ---------------------------------------------------------------------------

def test_constructor_stores_model():
    with patch("outbound.llm.client.genai.Client"):
        client = GeminiLlmClient(api_key="test-key", model="gemini-2.5-flash")
    assert client._model == "gemini-2.5-flash"


# ---------------------------------------------------------------------------
# tag_posts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_tag_posts_returns_tagging_results():
    posts = [make_post(id=1), make_post(id=2)]
    payload = json.dumps([
        {"post_id": 1, "sentiment": "negative", "tag_slugs": ["complaint", "saas"]},
        {"post_id": 2, "sentiment": "neutral", "tag_slugs": ["feature-request", "developer-tools"]},
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    results = await client.tag_posts(posts)

    assert len(results) == 2
    assert isinstance(results[0], TaggingResult)
    assert results[0].post_id == 1
    assert results[0].sentiment == "negative"
    assert results[0].tag_slugs == ["complaint", "saas"]


@pytest.mark.asyncio
async def test_tag_posts_unknown_post_id_is_skipped():
    """LLM returning an unknown post_id should be silently ignored."""
    posts = [make_post(id=5)]
    payload = json.dumps([
        {"post_id": 999, "sentiment": "negative", "tag_slugs": []},
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    results = await client.tag_posts(posts)

    assert results == []


@pytest.mark.asyncio
async def test_tag_posts_invalid_sentiment_defaults_to_neutral():
    posts = [make_post(id=1)]
    payload = json.dumps([
        {"post_id": 1, "sentiment": "INVALID", "tag_slugs": []},
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    results = await client.tag_posts(posts)

    assert results[0].sentiment == "neutral"


@pytest.mark.asyncio
async def test_tag_posts_invalid_post_type_defaults_to_other():
    """When the LLM returns an unknown post_type, it must be normalised to 'other'."""
    posts = [make_post(id=1)]
    payload = json.dumps([
        {"post_id": 1, "sentiment": "neutral", "post_type": "INVALID_TYPE", "tag_slugs": []},
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    results = await client.tag_posts(posts)

    assert len(results) == 1
    assert results[0].post_type == "other"


@pytest.mark.asyncio
async def test_tag_posts_invalid_tag_slugs_are_filtered():
    """Tag slugs that do not match the slug regex should be dropped."""
    posts = [make_post(id=1)]
    payload = json.dumps([
        {
            "post_id": 1,
            "sentiment": "negative",
            "tag_slugs": ["valid-slug", "INVALID SLUG!", 42, ""],
        },
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    results = await client.tag_posts(posts)

    assert results[0].tag_slugs == ["valid-slug"]


@pytest.mark.asyncio
async def test_tag_posts_tag_slugs_truncated_at_5():
    """More than 5 tag slugs should be capped at 5."""
    posts = [make_post(id=1)]
    slugs = [f"slug-{i:02d}" for i in range(15)]  # 15 valid slugs
    payload = json.dumps([
        {"post_id": 1, "sentiment": "neutral", "tag_slugs": slugs},
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    results = await client.tag_posts(posts)

    assert len(results[0].tag_slugs) == 5


@pytest.mark.asyncio
async def test_tag_posts_uses_correct_model():
    posts = [make_post(id=1)]
    payload = json.dumps([
        {"post_id": 1, "sentiment": "neutral", "tag_slugs": []},
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    await client.tag_posts(posts)

    call_kwargs = client._client.aio.models.generate_content.call_args
    assert call_kwargs.kwargs["model"] == "gemini-2.5-flash-lite"


@pytest.mark.asyncio
async def test_tag_posts_missing_fields_use_defaults():
    """Items missing sentiment/tag_slugs should use safe defaults."""
    posts = [make_post(id=1)]
    payload = json.dumps([{"post_id": 1}])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    results = await client.tag_posts(posts)

    assert results[0].sentiment == "neutral"
    assert results[0].tag_slugs == []


@pytest.mark.asyncio
async def test_tag_posts_existing_tags_injected_into_prompt():
    """existing_tags should be included in the prompt sent to the LLM."""
    posts = [make_post(id=1)]
    payload = json.dumps([
        {"post_id": 1, "sentiment": "negative", "tag_slugs": ["saas"]},
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    await client.tag_posts(posts, existing_tags=["saas", "fintech", "ai-ml"])

    call_args = client._client.aio.models.generate_content.call_args
    prompt = call_args.kwargs["contents"]
    assert "saas, fintech, ai-ml" in prompt


@pytest.mark.asyncio
async def test_tag_posts_no_existing_tags_shows_none_yet():
    """When no existing tags, prompt should show '(none yet)'."""
    posts = [make_post(id=1)]
    payload = json.dumps([
        {"post_id": 1, "sentiment": "neutral", "tag_slugs": ["new-tag"]},
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    await client.tag_posts(posts)

    call_args = client._client.aio.models.generate_content.call_args
    prompt = call_args.kwargs["contents"]
    assert "(none yet)" in prompt


@pytest.mark.asyncio
async def test_tag_posts_prompt_asks_for_tag_reuse():
    """The tagging prompt should instruct to reuse existing tags."""
    posts = [make_post(id=1)]
    payload = json.dumps([
        {"post_id": 1, "sentiment": "neutral", "tag_slugs": []},
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    await client.tag_posts(posts)

    call_args = client._client.aio.models.generate_content.call_args
    prompt = call_args.kwargs["contents"]
    assert "MUST reuse" in prompt


# ---------------------------------------------------------------------------
# cluster_posts — embedding-based clustering
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cluster_posts_few_posts_returns_general():
    """When fewer than 3 posts, return single General cluster."""
    posts = [make_post(id=1), make_post(id=2)]
    client = _make_client()

    results = await client.cluster_posts(posts)

    assert len(results) == 1
    assert results[0].label == "General"
    assert results[0].post_ids == [1, 2]


@pytest.mark.asyncio
async def test_cluster_posts_uses_embeddings_and_hdbscan():
    """When 3+ posts, cluster_posts should use embedding + HDBSCAN."""
    posts = [make_post(id=i) for i in range(1, 6)]
    client = _make_client()

    # Mock embedding call
    mock_embeddings = [[float(i)] * 10 for i in range(5)]
    mock_embed_result = MagicMock()
    mock_embed_result.embeddings = [MagicMock(values=e) for e in mock_embeddings]
    client._client.aio.models.embed_content = AsyncMock(return_value=mock_embed_result)

    # Mock HDBSCAN — all noise (label=-1) since embeddings are too simple
    # This will produce a Miscellaneous cluster
    label_data = json.dumps({"label": "Test Label", "summary": "Test summary"})
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(label_data)
    )

    results = await client.cluster_posts(posts)

    # Should have at least one cluster
    assert len(results) >= 1
    # Should have called embed_content
    client._client.aio.models.embed_content.assert_called_once()


@pytest.mark.asyncio
async def test_cluster_posts_labels_non_noise_clusters():
    """Non-noise clusters should get LLM-generated labels."""
    posts = [make_post(id=i, title=f"Post {i}") for i in range(1, 8)]
    client = _make_client()

    # Mock embedding call
    mock_embeddings = [[float(i)] * 10 for i in range(7)]
    mock_embed_result = MagicMock()
    mock_embed_result.embeddings = [MagicMock(values=e) for e in mock_embeddings]
    client._client.aio.models.embed_content = AsyncMock(return_value=mock_embed_result)

    # Mock _hdbscan_cluster to return controlled groups
    client._hdbscan_cluster = MagicMock(return_value={
        0: [1, 2, 3],
        1: [4, 5, 6],
        -1: [7],
    })

    label_responses = [
        _make_response(json.dumps({"label": "Cluster A", "summary": "Summary A"})),
        _make_response(json.dumps({"label": "Cluster B", "summary": "Summary B"})),
    ]
    client._client.aio.models.generate_content = AsyncMock(side_effect=label_responses)

    results = await client.cluster_posts(posts)

    assert len(results) == 3
    labels = {r.label for r in results}
    assert "Cluster A" in labels
    assert "Cluster B" in labels
    assert "Miscellaneous" in labels


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
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(json.dumps(data))
    )

    result = await client.synthesize_brief(label="Pricing", summary="Pricing issues", posts=posts)

    assert isinstance(result, BriefDraft)
    assert result.title == "Better Pricing Transparency"
    assert result.slug == "better-pricing-transparency"
    assert result.source_post_ids == [1]


@pytest.mark.asyncio
async def test_synthesize_brief_uses_correct_model():
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
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(json.dumps(data))
    )

    await client.synthesize_brief(label="L", summary="S", posts=posts)

    call_kwargs = client._client.aio.models.generate_content.call_args
    assert call_kwargs.kwargs["model"] == "gemini-2.5-flash"
    assert call_kwargs.kwargs["config"]["temperature"] == 0.9


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
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(fenced)
    )

    result = await client.synthesize_brief(label="L", summary="S", posts=posts)

    assert result.title == "T"


@pytest.mark.asyncio
async def test_synthesize_brief_with_trends_data():
    """Trends data should be included in the prompt."""
    posts = [make_post(id=1)]
    data = {
        "title": "T",
        "slug": "t",
        "summary": "S",
        "problem_statement": "P",
        "opportunity": "O",
        "solution_directions": [],
        "demand_signals": {"post_count": 1, "trend_data": {"avg_interest": {"test": 50}}},
        "source_snapshots": [],
        "source_post_ids": [1],
    }
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(json.dumps(data))
    )

    trends = {"avg_interest": {"saas": 50}, "trend_direction": {"saas": "rising"}}
    await client.synthesize_brief(
        label="L", summary="S", posts=posts, trends_data=trends,
    )

    call_args = client._client.aio.models.generate_content.call_args
    prompt = call_args.kwargs["contents"]
    assert "Google Trends" in prompt
    assert "rising" in prompt


@pytest.mark.asyncio
async def test_synthesize_brief_with_related_products():
    """Related products should be included in the prompt."""
    posts = [make_post(id=1)]
    data = {
        "title": "T",
        "slug": "t",
        "summary": "S",
        "problem_statement": "P",
        "opportunity": "O",
        "solution_directions": [],
        "demand_signals": {"post_count": 1, "competitive_landscape": "Analysis here"},
        "source_snapshots": [],
        "source_post_ids": [1],
    }
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(json.dumps(data))
    )

    products = [
        RawProduct(
            external_id="ph-1",
            name="CompetitorApp",
            slug="competitor",
            tagline="A competitor",
            description="Desc",
            url="https://competitor.com",
            category="SaaS",
            launched_at=None,
        )
    ]
    await client.synthesize_brief(
        label="L", summary="S", posts=posts, related_products=products,
    )

    call_args = client._client.aio.models.generate_content.call_args
    prompt = call_args.kwargs["contents"]
    assert "CompetitorApp" in prompt
    assert "competitive_landscape" in prompt


# ---------------------------------------------------------------------------
# tag_posts — non-int post_id security check
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_tag_posts_non_int_post_id_is_skipped():
    """When post_id is a string (not int), the item should be skipped with a warning."""
    posts = [make_post(id=1)]
    payload = json.dumps([
        {"post_id": "1", "sentiment": "negative", "tag_slugs": ["saas"]},  # string, not int
        {"post_id": 1, "sentiment": "neutral", "tag_slugs": []},           # valid int
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    results = await client.tag_posts(posts)

    # Only the second item (valid int) should be returned
    assert len(results) == 1
    assert results[0].post_id == 1


@pytest.mark.asyncio
async def test_tag_posts_none_post_id_is_skipped():
    """When post_id is None, the item should be skipped."""
    posts = [make_post(id=1)]
    payload = json.dumps([
        {"post_id": None, "sentiment": "negative", "tag_slugs": ["saas"]},
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    results = await client.tag_posts(posts)

    assert results == []


@pytest.mark.asyncio
async def test_tag_posts_float_post_id_is_skipped():
    """When post_id is a float (not int), the item should be skipped."""
    posts = [make_post(id=1)]
    payload = json.dumps([
        {"post_id": 1.5, "sentiment": "negative", "tag_slugs": ["saas"]},
    ])
    client = _make_client()
    client._client.aio.models.generate_content = AsyncMock(
        return_value=_make_response(payload)
    )

    results = await client.tag_posts(posts)

    assert results == []


# ---------------------------------------------------------------------------
# _hdbscan_cluster — real cluster (non-noise) path
# ---------------------------------------------------------------------------


def test_hdbscan_cluster_groups_similar_posts():
    """When embeddings are identical (clustered), posts should be assigned to real groups."""
    import numpy as np

    posts = [make_post(id=i) for i in range(1, 11)]
    client = _make_client()

    # Create embeddings where posts 0-4 are identical (guaranteed cluster)
    # and posts 5-9 are identical but very different from 0-4
    group_a = [1.0, 0.0] + [0.0] * 8   # 10-dim
    group_b = [0.0, 1.0] + [0.0] * 8

    embeddings = [group_a] * 5 + [group_b] * 5

    groups = client._hdbscan_cluster(embeddings, posts)

    # With identical embeddings in two groups, HDBSCAN should assign them to clusters
    # (not all noise). Check that at least some posts are in non-noise groups.
    non_noise_keys = [k for k in groups if k != -1]
    assert len(non_noise_keys) >= 1


def test_hdbscan_cluster_all_noise_produces_minus_one_group():
    """When all posts are noise, groups should only contain key -1."""
    posts = [make_post(id=i) for i in range(1, 4)]
    client = _make_client()

    # Random spread embeddings that won't cluster with min_cluster_size=3
    import random
    random.seed(42)
    embeddings = [[random.uniform(-100, 100) for _ in range(50)] for _ in range(3)]

    groups = client._hdbscan_cluster(embeddings, posts)

    # All three posts are likely noise — key -1 should exist
    all_keys = set(groups.keys())
    assert -1 in all_keys


# ---------------------------------------------------------------------------
# tag_posts — null/empty response.text safety check
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_tag_posts_raises_when_response_text_is_none():
    """When Gemini returns a response with text=None (safety-filtered), raise ValueError.

    tag_posts has a @retry decorator, so tenacity exhausts all attempts and wraps
    the ValueError in a RetryError. We check the root cause is the ValueError.
    """
    from tenacity import RetryError

    posts = [make_post(id=1)]
    client = _make_client()

    none_response = MagicMock()
    none_response.text = None
    client._client.aio.models.generate_content = AsyncMock(return_value=none_response)

    with pytest.raises(RetryError) as exc_info:
        await client.tag_posts(posts)

    # The root cause must be the ValueError raised by the null check
    cause = exc_info.value.last_attempt.exception()
    assert isinstance(cause, ValueError)
    assert "Gemini returned empty response" in str(cause)


@pytest.mark.asyncio
async def test_tag_posts_raises_when_response_text_is_empty_string():
    """When Gemini returns a response with text='' (empty string), raise ValueError.

    The @retry decorator wraps the ValueError in RetryError after all attempts fail.
    """
    from tenacity import RetryError

    posts = [make_post(id=1)]
    client = _make_client()

    empty_response = MagicMock()
    empty_response.text = ""
    client._client.aio.models.generate_content = AsyncMock(return_value=empty_response)

    with pytest.raises(RetryError) as exc_info:
        await client.tag_posts(posts)

    cause = exc_info.value.last_attempt.exception()
    assert isinstance(cause, ValueError)
    assert "Gemini returned empty response" in str(cause)


@pytest.mark.asyncio
async def test_tag_posts_error_message_mentions_safety_filter():
    """The ValueError message should mention 'safety-filtered'."""
    from tenacity import RetryError

    posts = [make_post(id=1)]
    client = _make_client()

    none_response = MagicMock()
    none_response.text = None
    client._client.aio.models.generate_content = AsyncMock(return_value=none_response)

    with pytest.raises(RetryError) as exc_info:
        await client.tag_posts(posts)

    cause = exc_info.value.last_attempt.exception()
    assert "safety-filtered" in str(cause)


# ---------------------------------------------------------------------------
# synthesize_brief — empty response.text safety check
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_synthesize_brief_raises_when_response_text_is_none():
    """When Gemini returns a response with text=None in synthesize_brief,
    a ValueError must be raised (client.py line 317).

    synthesize_brief has a @retry decorator, so tenacity exhausts all
    attempts and wraps the ValueError in a RetryError.
    """
    from tenacity import RetryError

    posts = [make_post(id=1)]
    client = _make_client()

    none_response = MagicMock()
    none_response.text = None
    client._client.aio.models.generate_content = AsyncMock(return_value=none_response)

    with pytest.raises(RetryError) as exc_info:
        await client.synthesize_brief(label="L", summary="S", posts=posts)

    cause = exc_info.value.last_attempt.exception()
    assert isinstance(cause, ValueError)
    assert "Gemini returned empty response" in str(cause)
    assert "safety-filtered" in str(cause)


@pytest.mark.asyncio
async def test_synthesize_brief_raises_when_response_text_is_empty_string():
    """When Gemini returns a response with text='' in synthesize_brief,
    a ValueError must be raised.
    """
    from tenacity import RetryError

    posts = [make_post(id=1)]
    client = _make_client()

    empty_response = MagicMock()
    empty_response.text = ""
    client._client.aio.models.generate_content = AsyncMock(return_value=empty_response)

    with pytest.raises(RetryError) as exc_info:
        await client.synthesize_brief(label="L", summary="S", posts=posts)

    cause = exc_info.value.last_attempt.exception()
    assert isinstance(cause, ValueError)
    assert "Gemini returned empty response" in str(cause)
