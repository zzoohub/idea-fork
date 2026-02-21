"""Tests for domain/pipeline/service.py — PipelineService."""
from unittest.mock import AsyncMock, call

import pytest

from domain.pipeline.models import (
    BriefDraft,
    ClusteringResult,
    PipelineRunResult,
    TaggingResult,
)
from domain.pipeline.service import PipelineService, TAGGING_BATCH_SIZE
from tests.conftest import make_post


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_repo(*, locked: bool = True) -> AsyncMock:
    repo = AsyncMock()
    repo.acquire_advisory_lock = AsyncMock(return_value=locked)
    repo.release_advisory_lock = AsyncMock(return_value=None)
    repo.upsert_posts = AsyncMock(return_value=0)
    repo.get_pending_posts = AsyncMock(return_value=[])
    repo.get_tagged_posts_without_cluster = AsyncMock(return_value=[])
    repo.get_clusters_without_briefs = AsyncMock(return_value=[])
    repo.save_tagging_results = AsyncMock(return_value=None)
    repo.mark_tagging_failed = AsyncMock(return_value=None)
    repo.save_clusters = AsyncMock(return_value=None)
    repo.save_brief = AsyncMock(return_value=None)
    return repo


def make_reddit(*, posts=None) -> AsyncMock:
    reddit = AsyncMock()
    reddit.fetch_posts = AsyncMock(return_value=posts if posts is not None else [])
    return reddit


def make_llm() -> AsyncMock:
    llm = AsyncMock()
    llm.tag_posts = AsyncMock(return_value=[])
    llm.cluster_posts = AsyncMock(return_value=[])
    llm.synthesize_brief = AsyncMock(return_value=None)
    return llm


def make_tagging_result(post_id: int) -> TaggingResult:
    return TaggingResult(
        post_id=post_id,
        post_type="complaint",
        sentiment="negative",
        tag_slugs=["saas"],
    )


def make_clustering_result(label: str, post_ids: list[int]) -> ClusteringResult:
    return ClusteringResult(label=label, summary="A cluster summary.", post_ids=post_ids)


def make_brief_draft(title: str = "Test Brief") -> BriefDraft:
    return BriefDraft(
        title=title,
        slug="test-brief",
        summary="Summary.",
        problem_statement="Problem.",
        opportunity="Opportunity.",
        solution_directions=["A", "B"],
        demand_signals={"post_count": 2},
        source_snapshots=[],
        source_post_ids=[1, 2],
    )


def make_service(repo=None, reddit=None, llm=None, subreddits=None) -> PipelineService:
    return PipelineService(
        repo=repo or make_repo(),
        reddit=reddit or make_reddit(),
        llm=llm or make_llm(),
        subreddits=subreddits or ["saas", "startups"],
        fetch_limit=50,
    )


# ---------------------------------------------------------------------------
# Advisory lock behavior
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_run_skips_all_stages_when_lock_not_acquired():
    repo = make_repo(locked=False)
    reddit = make_reddit()
    svc = make_service(repo=repo, reddit=reddit)

    result = await svc.run()

    assert isinstance(result, PipelineRunResult)
    assert result.has_errors is True
    assert any("advisory lock" in e.lower() for e in result.errors)
    repo.release_advisory_lock.assert_not_called()
    reddit.fetch_posts.assert_not_called()


@pytest.mark.asyncio
async def test_run_acquires_and_releases_lock_on_success():
    repo = make_repo(locked=True)
    svc = make_service(repo=repo)

    await svc.run()

    repo.acquire_advisory_lock.assert_called_once()
    repo.release_advisory_lock.assert_called_once()


@pytest.mark.asyncio
async def test_run_releases_lock_even_when_stage_raises():
    """Lock must be released in the finally block even if a stage crashes hard."""
    repo = make_repo(locked=True)
    # Make get_pending_posts raise an unexpected exception beyond normal stage error
    # We test by making upsert_posts raise — this is caught inside _stage_fetch,
    # so it does NOT propagate out of try. To test the finally path we need
    # to make acquire_advisory_lock succeed but one of the awaited top-level calls
    # fail with an unexpected exception. Patch get_clusters_without_briefs to raise.
    repo.get_clusters_without_briefs = AsyncMock(side_effect=RuntimeError("db down"))
    svc = make_service(repo=repo)

    result = await svc.run()

    repo.release_advisory_lock.assert_called_once()
    assert result.has_errors is True


# ---------------------------------------------------------------------------
# Stage fetch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stage_fetch_records_fetched_count():
    from domain.pipeline.models import RawRedditPost
    from datetime import datetime, timezone

    raw_post = RawRedditPost(
        external_id="id1",
        subreddit="saas",
        title="Complaint",
        body=None,
        external_url="https://reddit.com/r/saas/id1",
        external_created_at=datetime(2026, 2, 18, tzinfo=timezone.utc),
        score=10,
        num_comments=2,
    )
    reddit = make_reddit(posts=[raw_post, raw_post])
    repo = make_repo()
    repo.upsert_posts = AsyncMock(return_value=2)
    svc = make_service(repo=repo, reddit=reddit)

    result = await svc.run()

    assert result.posts_fetched == 2
    assert result.posts_upserted == 2
    repo.upsert_posts.assert_called_once()


@pytest.mark.asyncio
async def test_stage_fetch_no_posts_skips_upsert():
    reddit = make_reddit(posts=[])
    repo = make_repo()
    svc = make_service(repo=repo, reddit=reddit)

    result = await svc.run()

    assert result.posts_fetched == 0
    assert result.posts_upserted == 0
    repo.upsert_posts.assert_not_called()


@pytest.mark.asyncio
async def test_stage_fetch_error_recorded_continues_pipeline():
    reddit = make_reddit()
    reddit.fetch_posts = AsyncMock(side_effect=RuntimeError("network error"))
    repo = make_repo()
    svc = make_service(repo=repo, reddit=reddit)

    result = await svc.run()

    assert result.has_errors is True
    assert any("Fetch" in e for e in result.errors)
    # Pipeline should still attempt subsequent stages
    repo.get_pending_posts.assert_called_once()


# ---------------------------------------------------------------------------
# Stage tag
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stage_tag_no_pending_posts_skips():
    repo = make_repo()
    repo.get_pending_posts = AsyncMock(return_value=[])
    llm = make_llm()
    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.posts_tagged == 0
    llm.tag_posts.assert_not_called()


@pytest.mark.asyncio
async def test_stage_tag_single_batch():
    posts = [make_post(id=i) for i in range(1, 4)]
    repo = make_repo()
    repo.get_pending_posts = AsyncMock(return_value=posts)
    tagging_results = [make_tagging_result(p.id) for p in posts]
    llm = make_llm()
    llm.tag_posts = AsyncMock(return_value=tagging_results)
    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.posts_tagged == 3
    llm.tag_posts.assert_called_once_with(posts)
    repo.save_tagging_results.assert_called_once_with(tagging_results)


@pytest.mark.asyncio
async def test_stage_tag_multiple_batches():
    """More posts than TAGGING_BATCH_SIZE results in multiple batches."""
    post_count = TAGGING_BATCH_SIZE + 5
    posts = [make_post(id=i) for i in range(1, post_count + 1)]

    repo = make_repo()
    repo.get_pending_posts = AsyncMock(return_value=posts)

    llm = make_llm()

    def make_results(batch):
        return [make_tagging_result(p.id) for p in batch]

    llm.tag_posts = AsyncMock(side_effect=lambda batch: make_results(batch))

    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.posts_tagged == post_count
    assert llm.tag_posts.call_count == 2
    repo.save_tagging_results.call_count == 2


@pytest.mark.asyncio
async def test_stage_tag_batch_error_marks_failed_and_records_error():
    posts = [make_post(id=1), make_post(id=2)]
    repo = make_repo()
    repo.get_pending_posts = AsyncMock(return_value=posts)

    llm = make_llm()
    llm.tag_posts = AsyncMock(side_effect=RuntimeError("LLM unavailable"))

    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.posts_tagged == 0
    assert result.has_errors is True
    assert any("Tag batch" in e for e in result.errors)
    repo.mark_tagging_failed.assert_called_once_with([1, 2])


@pytest.mark.asyncio
async def test_stage_tag_second_batch_succeeds_first_fails():
    """First batch fails, second succeeds — both are counted correctly."""
    first_batch = [make_post(id=i) for i in range(1, TAGGING_BATCH_SIZE + 1)]
    second_batch = [make_post(id=TAGGING_BATCH_SIZE + 1)]
    all_posts = first_batch + second_batch

    repo = make_repo()
    repo.get_pending_posts = AsyncMock(return_value=all_posts)

    call_count = 0

    async def tag_side_effect(batch):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise RuntimeError("first batch error")
        return [make_tagging_result(p.id) for p in batch]

    llm = make_llm()
    llm.tag_posts = AsyncMock(side_effect=tag_side_effect)

    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.posts_tagged == 1
    assert result.has_errors is True
    assert any("Tag batch" in e for e in result.errors)
    repo.mark_tagging_failed.assert_called_once()


@pytest.mark.asyncio
async def test_stage_tag_outer_exception_recorded():
    """get_pending_posts itself failing is caught at the outer level."""
    repo = make_repo()
    repo.get_pending_posts = AsyncMock(side_effect=RuntimeError("db error"))

    svc = make_service(repo=repo)

    result = await svc.run()

    assert result.has_errors is True
    assert any("Tag" in e for e in result.errors)


# ---------------------------------------------------------------------------
# Stage cluster
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stage_cluster_no_posts_skips():
    repo = make_repo()
    repo.get_tagged_posts_without_cluster = AsyncMock(return_value=[])
    llm = make_llm()
    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.clusters_created == 0
    llm.cluster_posts.assert_not_called()


@pytest.mark.asyncio
async def test_stage_cluster_creates_clusters():
    posts = [make_post(id=1), make_post(id=2), make_post(id=3)]
    clusters = [make_clustering_result("Cluster A", [1, 2, 3])]

    repo = make_repo()
    repo.get_tagged_posts_without_cluster = AsyncMock(return_value=posts)
    llm = make_llm()
    llm.cluster_posts = AsyncMock(return_value=clusters)

    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.clusters_created == 1
    llm.cluster_posts.assert_called_once_with(posts)
    repo.save_clusters.assert_called_once_with(clusters)


@pytest.mark.asyncio
async def test_stage_cluster_multiple_clusters():
    posts = [make_post(id=i) for i in range(1, 5)]
    clusters = [
        make_clustering_result("Cluster A", [1, 2]),
        make_clustering_result("Cluster B", [3, 4]),
    ]

    repo = make_repo()
    repo.get_tagged_posts_without_cluster = AsyncMock(return_value=posts)
    llm = make_llm()
    llm.cluster_posts = AsyncMock(return_value=clusters)

    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.clusters_created == 2


@pytest.mark.asyncio
async def test_stage_cluster_error_recorded_continues_pipeline():
    repo = make_repo()
    repo.get_tagged_posts_without_cluster = AsyncMock(
        side_effect=RuntimeError("query failed")
    )
    svc = make_service(repo=repo)

    result = await svc.run()

    assert result.has_errors is True
    assert any("Cluster" in e for e in result.errors)
    # Pipeline should still attempt the brief stage
    repo.get_clusters_without_briefs.assert_called_once()


@pytest.mark.asyncio
async def test_stage_cluster_llm_error_recorded():
    posts = [make_post(id=1)]
    repo = make_repo()
    repo.get_tagged_posts_without_cluster = AsyncMock(return_value=posts)
    llm = make_llm()
    llm.cluster_posts = AsyncMock(side_effect=RuntimeError("LLM timeout"))

    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.has_errors is True
    assert any("Cluster" in e for e in result.errors)


# ---------------------------------------------------------------------------
# Stage brief
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stage_brief_no_clusters_skips():
    repo = make_repo()
    repo.get_clusters_without_briefs = AsyncMock(return_value=[])
    llm = make_llm()
    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.briefs_generated == 0
    llm.synthesize_brief.assert_not_called()


@pytest.mark.asyncio
async def test_stage_brief_generates_brief_per_cluster():
    posts = [make_post(id=1), make_post(id=2)]
    clusters_data = [(42, "SaaS Pain", "Cluster summary", posts)]

    repo = make_repo()
    repo.get_clusters_without_briefs = AsyncMock(return_value=clusters_data)

    draft = make_brief_draft("SaaS Pain Brief")
    llm = make_llm()
    llm.synthesize_brief = AsyncMock(return_value=draft)

    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.briefs_generated == 1
    llm.synthesize_brief.assert_called_once_with("SaaS Pain", "Cluster summary", posts)
    repo.save_brief.assert_called_once_with(42, draft)


@pytest.mark.asyncio
async def test_stage_brief_multiple_clusters():
    posts_a = [make_post(id=1)]
    posts_b = [make_post(id=2)]
    clusters_data = [
        (10, "Label A", "Summary A", posts_a),
        (11, "Label B", "Summary B", posts_b),
    ]

    repo = make_repo()
    repo.get_clusters_without_briefs = AsyncMock(return_value=clusters_data)

    draft_a = make_brief_draft("Brief A")
    draft_b = make_brief_draft("Brief B")
    llm = make_llm()
    llm.synthesize_brief = AsyncMock(side_effect=[draft_a, draft_b])

    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.briefs_generated == 2
    assert repo.save_brief.call_count == 2


@pytest.mark.asyncio
async def test_stage_brief_single_cluster_error_records_and_continues():
    posts_a = [make_post(id=1)]
    posts_b = [make_post(id=2)]
    clusters_data = [
        (10, "Label A", "Summary A", posts_a),
        (11, "Label B", "Summary B", posts_b),
    ]

    repo = make_repo()
    repo.get_clusters_without_briefs = AsyncMock(return_value=clusters_data)

    draft_b = make_brief_draft("Brief B")
    llm = make_llm()
    llm.synthesize_brief = AsyncMock(side_effect=[RuntimeError("LLM failed"), draft_b])

    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    # Second brief still generated despite first failure
    assert result.briefs_generated == 1
    assert result.has_errors is True
    assert any("cluster 10" in e for e in result.errors)
    repo.save_brief.assert_called_once_with(11, draft_b)


@pytest.mark.asyncio
async def test_stage_brief_outer_error_recorded():
    repo = make_repo()
    repo.get_clusters_without_briefs = AsyncMock(side_effect=RuntimeError("db gone"))
    svc = make_service(repo=repo)

    result = await svc.run()

    assert result.has_errors is True
    assert any("Brief" in e for e in result.errors)


# ---------------------------------------------------------------------------
# Full pipeline run — happy path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_full_pipeline_run_happy_path():
    from domain.pipeline.models import RawRedditPost
    from datetime import datetime, timezone

    raw_post = RawRedditPost(
        external_id="id1",
        subreddit="saas",
        title="Pain",
        body="It hurts",
        external_url="https://reddit.com/r/saas/id1",
        external_created_at=datetime(2026, 2, 18, tzinfo=timezone.utc),
        score=50,
        num_comments=10,
    )
    post = make_post(id=1)
    cluster_posts = [post]
    draft = make_brief_draft("Full Brief")
    clusters_data = [(99, "Theme", "Theme summary", cluster_posts)]
    clustering_result = [make_clustering_result("Theme", [1])]
    tagging_result = [make_tagging_result(1)]

    repo = make_repo()
    repo.upsert_posts = AsyncMock(return_value=1)
    repo.get_pending_posts = AsyncMock(return_value=[post])
    repo.get_tagged_posts_without_cluster = AsyncMock(return_value=[post])
    repo.get_clusters_without_briefs = AsyncMock(return_value=clusters_data)

    reddit = make_reddit(posts=[raw_post])
    llm = make_llm()
    llm.tag_posts = AsyncMock(return_value=tagging_result)
    llm.cluster_posts = AsyncMock(return_value=clustering_result)
    llm.synthesize_brief = AsyncMock(return_value=draft)

    svc = make_service(repo=repo, reddit=reddit, llm=llm)

    result = await svc.run()

    assert result.has_errors is False
    assert result.posts_fetched == 1
    assert result.posts_upserted == 1
    assert result.posts_tagged == 1
    assert result.clusters_created == 1
    assert result.briefs_generated == 1


# ---------------------------------------------------------------------------
# Constructor / config
# ---------------------------------------------------------------------------


def test_pipeline_service_constructor_stores_config():
    repo = make_repo()
    reddit = make_reddit()
    llm = make_llm()
    subreddits = ["r1", "r2"]

    svc = PipelineService(
        repo=repo,
        reddit=reddit,
        llm=llm,
        subreddits=subreddits,
        fetch_limit=200,
    )

    assert svc._subreddits == ["r1", "r2"]
    assert svc._fetch_limit == 200


def test_pipeline_service_default_fetch_limit():
    svc = PipelineService(
        repo=make_repo(),
        reddit=make_reddit(),
        llm=make_llm(),
        subreddits=["saas"],
    )

    assert svc._fetch_limit == 100
