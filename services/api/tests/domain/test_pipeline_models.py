"""Tests for domain/pipeline/models.py — pure dataclasses and PipelineRunResult."""
from datetime import datetime, timezone

import pytest

from domain.pipeline.models import (
    BriefDraft,
    ClusteringResult,
    PipelineRunResult,
    RawRedditPost,
    TaggingResult,
)


# ---------------------------------------------------------------------------
# RawRedditPost
# ---------------------------------------------------------------------------


def test_raw_reddit_post_construction():
    now = datetime(2026, 2, 18, 10, 0, tzinfo=timezone.utc)
    post = RawRedditPost(
        external_id="abc123",
        subreddit="python",
        title="My complaint",
        body="The body text",
        external_url="https://reddit.com/r/python/abc123",
        external_created_at=now,
        score=42,
        num_comments=7,
    )

    assert post.external_id == "abc123"
    assert post.subreddit == "python"
    assert post.title == "My complaint"
    assert post.body == "The body text"
    assert post.external_url == "https://reddit.com/r/python/abc123"
    assert post.external_created_at == now
    assert post.score == 42
    assert post.num_comments == 7


def test_raw_reddit_post_body_none():
    now = datetime(2026, 2, 18, tzinfo=timezone.utc)
    post = RawRedditPost(
        external_id="xyz",
        subreddit="saas",
        title="Title only",
        body=None,
        external_url="https://reddit.com/r/saas/xyz",
        external_created_at=now,
        score=0,
        num_comments=0,
    )

    assert post.body is None


def test_raw_reddit_post_is_frozen():
    now = datetime(2026, 2, 18, tzinfo=timezone.utc)
    post = RawRedditPost(
        external_id="id1",
        subreddit="test",
        title="Test",
        body=None,
        external_url="https://reddit.com",
        external_created_at=now,
        score=1,
        num_comments=0,
    )

    with pytest.raises((AttributeError, TypeError)):
        post.external_id = "changed"  # type: ignore[misc]


def test_raw_reddit_post_equality():
    now = datetime(2026, 2, 18, tzinfo=timezone.utc)
    kwargs = dict(
        external_id="id1",
        subreddit="test",
        title="Test",
        body=None,
        external_url="https://reddit.com",
        external_created_at=now,
        score=5,
        num_comments=2,
    )
    assert RawRedditPost(**kwargs) == RawRedditPost(**kwargs)


# ---------------------------------------------------------------------------
# TaggingResult
# ---------------------------------------------------------------------------


def test_tagging_result_construction():
    result = TaggingResult(
        post_id=10,
        post_type="complaint",
        sentiment="negative",
        tag_slugs=["saas", "developer-tools"],
    )

    assert result.post_id == 10
    assert result.post_type == "complaint"
    assert result.sentiment == "negative"
    assert result.tag_slugs == ["saas", "developer-tools"]


def test_tagging_result_empty_tag_slugs():
    result = TaggingResult(
        post_id=5,
        post_type="question",
        sentiment="neutral",
        tag_slugs=[],
    )

    assert result.tag_slugs == []


def test_tagging_result_is_frozen():
    result = TaggingResult(
        post_id=1,
        post_type="other",
        sentiment="positive",
        tag_slugs=["ai-ml"],
    )

    with pytest.raises((AttributeError, TypeError)):
        result.post_id = 99  # type: ignore[misc]


def test_tagging_result_equality():
    kwargs = dict(post_id=1, post_type="complaint", sentiment="negative", tag_slugs=["saas"])
    assert TaggingResult(**kwargs) == TaggingResult(**kwargs)


# ---------------------------------------------------------------------------
# ClusteringResult
# ---------------------------------------------------------------------------


def test_clustering_result_construction():
    result = ClusteringResult(
        label="SaaS Pricing Pain",
        summary="Users complain about opaque pricing models.",
        post_ids=[1, 2, 3],
    )

    assert result.label == "SaaS Pricing Pain"
    assert result.summary == "Users complain about opaque pricing models."
    assert result.post_ids == [1, 2, 3]


def test_clustering_result_empty_post_ids():
    result = ClusteringResult(label="Empty Cluster", summary="No posts.", post_ids=[])
    assert result.post_ids == []


def test_clustering_result_is_frozen():
    result = ClusteringResult(label="L", summary="S", post_ids=[1])

    with pytest.raises((AttributeError, TypeError)):
        result.label = "changed"  # type: ignore[misc]


def test_clustering_result_equality():
    kwargs = dict(label="L", summary="S", post_ids=[1, 2])
    assert ClusteringResult(**kwargs) == ClusteringResult(**kwargs)


# ---------------------------------------------------------------------------
# BriefDraft
# ---------------------------------------------------------------------------


def test_brief_draft_construction():
    draft = BriefDraft(
        title="A compelling brief title for founders",
        slug="compelling-brief-title-for-founders",
        summary="Two sentence executive summary here.",
        problem_statement="Detailed description of the pain point.",
        opportunity="This is the product opportunity.",
        solution_directions=["Approach A", "Approach B", "Approach C"],
        demand_signals={"post_count": 15, "subreddit_count": 3, "avg_score": 42.5, "total_comments": 200},
        source_snapshots=[
            {"post_id": 1, "title": "A post", "snippet": "...", "external_url": "https://reddit.com", "subreddit": "saas", "score": 10}
        ],
        source_post_ids=[1, 2, 3],
    )

    assert draft.title == "A compelling brief title for founders"
    assert draft.slug == "compelling-brief-title-for-founders"
    assert draft.summary == "Two sentence executive summary here."
    assert draft.problem_statement == "Detailed description of the pain point."
    assert draft.opportunity == "This is the product opportunity."
    assert draft.solution_directions == ["Approach A", "Approach B", "Approach C"]
    assert draft.demand_signals["post_count"] == 15
    assert draft.source_post_ids == [1, 2, 3]
    assert len(draft.source_snapshots) == 1


def test_brief_draft_empty_collections():
    draft = BriefDraft(
        title="Minimal",
        slug="minimal",
        summary="Summary.",
        problem_statement="Problem.",
        opportunity="Opportunity.",
        solution_directions=[],
        demand_signals={},
        source_snapshots=[],
        source_post_ids=[],
    )

    assert draft.solution_directions == []
    assert draft.demand_signals == {}
    assert draft.source_snapshots == []
    assert draft.source_post_ids == []


def test_brief_draft_is_frozen():
    draft = BriefDraft(
        title="T",
        slug="t",
        summary="S",
        problem_statement="P",
        opportunity="O",
        solution_directions=[],
        demand_signals={},
        source_snapshots=[],
        source_post_ids=[],
    )

    with pytest.raises((AttributeError, TypeError)):
        draft.title = "changed"  # type: ignore[misc]


def test_brief_draft_equality():
    kwargs = dict(
        title="T",
        slug="t",
        summary="S",
        problem_statement="P",
        opportunity="O",
        solution_directions=["A"],
        demand_signals={"post_count": 1},
        source_snapshots=[],
        source_post_ids=[1],
    )
    assert BriefDraft(**kwargs) == BriefDraft(**kwargs)


# ---------------------------------------------------------------------------
# PipelineRunResult
# ---------------------------------------------------------------------------


def test_pipeline_run_result_defaults():
    result = PipelineRunResult()

    assert result.posts_fetched == 0
    assert result.posts_upserted == 0
    assert result.posts_tagged == 0
    assert result.clusters_created == 0
    assert result.briefs_generated == 0
    assert result.errors == []


def test_pipeline_run_result_has_errors_false_when_no_errors():
    result = PipelineRunResult()
    assert result.has_errors is False


def test_pipeline_run_result_has_errors_true_when_errors_present():
    result = PipelineRunResult()
    result.errors.append("Something went wrong")
    assert result.has_errors is True


def test_pipeline_run_result_has_errors_multiple_errors():
    result = PipelineRunResult()
    result.errors.append("Error 1")
    result.errors.append("Error 2")
    assert result.has_errors is True
    assert len(result.errors) == 2


def test_pipeline_run_result_mutable_fields():
    result = PipelineRunResult()
    result.posts_fetched = 10
    result.posts_upserted = 8
    result.posts_tagged = 6
    result.clusters_created = 2
    result.briefs_generated = 2

    assert result.posts_fetched == 10
    assert result.posts_upserted == 8
    assert result.posts_tagged == 6
    assert result.clusters_created == 2
    assert result.briefs_generated == 2


def test_pipeline_run_result_errors_list_is_independent_per_instance():
    r1 = PipelineRunResult()
    r2 = PipelineRunResult()

    r1.errors.append("Only in r1")

    assert r1.has_errors is True
    assert r2.has_errors is False
    assert r2.errors == []
