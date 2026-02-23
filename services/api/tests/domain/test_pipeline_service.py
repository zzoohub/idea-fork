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
    repo.upsert_products = AsyncMock(return_value=0)
    repo.get_pending_posts = AsyncMock(return_value=[])
    repo.get_existing_tag_slugs = AsyncMock(return_value=[])
    repo.get_tagged_posts_without_cluster = AsyncMock(return_value=[])
    repo.get_clusters_without_briefs = AsyncMock(return_value=[])
    repo.save_tagging_results = AsyncMock(return_value=None)
    repo.mark_tagging_failed = AsyncMock(return_value=None)
    repo.save_clusters = AsyncMock(return_value=None)
    repo.save_brief = AsyncMock(return_value=None)
    repo.find_related_products = AsyncMock(return_value=[])
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


def make_rss(*, posts=None) -> AsyncMock:
    rss = AsyncMock()
    rss.fetch_posts = AsyncMock(return_value=posts if posts is not None else [])
    return rss


def make_trends(*, data=None) -> AsyncMock:
    trends = AsyncMock()
    trends.get_interest = AsyncMock(return_value=data if data is not None else {})
    return trends


def make_producthunt(*, products=None) -> AsyncMock:
    ph = AsyncMock()
    ph.fetch_recent_products = AsyncMock(return_value=products if products is not None else [])
    return ph


def make_tagging_result(post_id: int) -> TaggingResult:
    return TaggingResult(
        post_id=post_id,
        sentiment="negative",
        post_type="complaint",
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


def make_service(
    repo=None, reddit=None, llm=None, rss=None,
    trends=None, producthunt=None, subreddits=None,
) -> PipelineService:
    return PipelineService(
        repo=repo or make_repo(),
        reddit=reddit or make_reddit(),
        llm=llm or make_llm(),
        rss=rss or make_rss(),
        trends=trends or make_trends(),
        producthunt=producthunt or make_producthunt(),
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
    from domain.pipeline.models import RawPost
    from datetime import datetime, timezone

    raw_post = RawPost(
        source="reddit",
        external_id="id1",
        title="Complaint",
        body=None,
        external_url="https://reddit.com/r/saas/id1",
        external_created_at=datetime(2026, 2, 18, tzinfo=timezone.utc),
        score=10,
        num_comments=2,
        subreddit="saas",
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


@pytest.mark.asyncio
async def test_stage_fetch_includes_rss_posts():
    from domain.pipeline.models import RawPost
    from datetime import datetime, timezone

    reddit_post = RawPost(
        source="reddit",
        external_id="r1",
        title="Reddit post",
        body=None,
        external_url="https://reddit.com/r/saas/r1",
        external_created_at=datetime(2026, 2, 18, tzinfo=timezone.utc),
        score=10,
        num_comments=2,
        subreddit="saas",
    )
    rss_post = RawPost(
        source="rss",
        external_id="rss1",
        title="RSS post",
        body=None,
        external_url="https://hn.example.com/1",
        external_created_at=datetime(2026, 2, 18, tzinfo=timezone.utc),
        score=0,
        num_comments=0,
    )
    reddit = make_reddit(posts=[reddit_post])
    rss = make_rss(posts=[rss_post])
    repo = make_repo()
    repo.upsert_posts = AsyncMock(return_value=2)

    svc = PipelineService(
        repo=repo,
        reddit=reddit,
        llm=make_llm(),
        rss=rss,
        trends=make_trends(),
        producthunt=make_producthunt(),
        subreddits=["saas"],
        rss_feeds=["https://hnrss.org/newest"],
        fetch_limit=50,
    )

    result = await svc.run()

    assert result.posts_fetched == 2


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
    llm.tag_posts.assert_called_once_with(posts, existing_tags=[])
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

    llm.tag_posts = AsyncMock(side_effect=lambda batch, **kw: make_results(batch))

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
async def test_stage_tag_batch_error_message_includes_exception_type_and_message():
    """Error string must include exception class name and message for diagnostics."""
    posts = [make_post(id=1), make_post(id=2)]
    repo = make_repo()
    repo.get_pending_posts = AsyncMock(return_value=posts)

    llm = make_llm()
    llm.tag_posts = AsyncMock(side_effect=ValueError("bad json from llm"))

    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    assert result.has_errors is True
    # New format: "Tag batch failed (N posts): ExceptionType: message"
    error = next(e for e in result.errors if "Tag batch" in e)
    assert "ValueError" in error
    assert "bad json from llm" in error
    assert "2 posts" in error


@pytest.mark.asyncio
async def test_stage_tag_batch_error_message_includes_batch_size():
    """Error message must include the number of posts in the failed batch."""
    batch_size = TAGGING_BATCH_SIZE
    posts = [make_post(id=i) for i in range(1, batch_size + 1)]
    repo = make_repo()
    repo.get_pending_posts = AsyncMock(return_value=posts)

    llm = make_llm()
    llm.tag_posts = AsyncMock(side_effect=RuntimeError("timeout"))

    svc = make_service(repo=repo, llm=llm)

    result = await svc.run()

    error = next(e for e in result.errors if "Tag batch" in e)
    assert f"{batch_size} posts" in error


@pytest.mark.asyncio
async def test_stage_tag_second_batch_succeeds_first_fails():
    """First batch fails, second succeeds — both are counted correctly."""
    first_batch = [make_post(id=i) for i in range(1, TAGGING_BATCH_SIZE + 1)]
    second_batch = [make_post(id=TAGGING_BATCH_SIZE + 1)]
    all_posts = first_batch + second_batch

    repo = make_repo()
    repo.get_pending_posts = AsyncMock(return_value=all_posts)

    call_count = 0

    async def tag_side_effect(batch, **kw):
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
    # New format: exception class and message must appear in the error string
    error = next(e for e in result.errors if "Tag batch" in e)
    assert "RuntimeError" in error
    assert "first batch error" in error
    repo.mark_tagging_failed.assert_called_once()


@pytest.mark.asyncio
async def test_stage_tag_sleeps_after_each_batch():
    """asyncio.sleep(1) must be called once per batch, even on success."""
    from unittest.mock import patch as mock_patch

    posts = [make_post(id=i) for i in range(1, TAGGING_BATCH_SIZE + 6)]  # 2 batches
    repo = make_repo()
    repo.get_pending_posts = AsyncMock(return_value=posts)

    llm = make_llm()
    llm.tag_posts = AsyncMock(side_effect=lambda batch, **kw: [make_tagging_result(p.id) for p in batch])

    svc = make_service(repo=repo, llm=llm)

    with mock_patch("domain.pipeline.service.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        await svc.run()

    # 2 batches → 2 sleep calls
    assert mock_sleep.call_count == 2
    mock_sleep.assert_called_with(1)


@pytest.mark.asyncio
async def test_stage_tag_sleeps_after_failed_batch():
    """asyncio.sleep(1) must be called even when a batch raises an exception."""
    from unittest.mock import patch as mock_patch

    posts = [make_post(id=1)]
    repo = make_repo()
    repo.get_pending_posts = AsyncMock(return_value=posts)

    llm = make_llm()
    llm.tag_posts = AsyncMock(side_effect=RuntimeError("fail"))

    svc = make_service(repo=repo, llm=llm)

    with mock_patch("domain.pipeline.service.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        await svc.run()

    mock_sleep.assert_called_once_with(1)


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
    llm.synthesize_brief.assert_called_once()
    call_kwargs = llm.synthesize_brief.call_args
    assert call_kwargs.args[0] == "SaaS Pain"
    assert call_kwargs.args[1] == "Cluster summary"
    assert call_kwargs.args[2] == posts
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
    from domain.pipeline.models import RawPost
    from datetime import datetime, timezone

    raw_post = RawPost(
        source="reddit",
        external_id="id1",
        title="Pain",
        body="It hurts",
        external_url="https://reddit.com/r/saas/id1",
        external_created_at=datetime(2026, 2, 18, tzinfo=timezone.utc),
        score=50,
        num_comments=10,
        subreddit="saas",
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
        rss=make_rss(),
        trends=make_trends(),
        producthunt=make_producthunt(),
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
        rss=make_rss(),
        trends=make_trends(),
        producthunt=make_producthunt(),
        subreddits=["saas"],
    )

    assert svc._fetch_limit == 100


def test_pipeline_service_rss_feeds_defaults_to_empty():
    svc = PipelineService(
        repo=make_repo(),
        reddit=make_reddit(),
        llm=make_llm(),
        rss=make_rss(),
        trends=make_trends(),
        producthunt=make_producthunt(),
        subreddits=["saas"],
        rss_feeds=None,
    )

    assert svc._rss_feeds == []


# ---------------------------------------------------------------------------
# Stage fetch — Product Hunt sub-paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stage_fetch_upserts_producthunt_products():
    """When Product Hunt returns products, upsert_products should be called."""
    from domain.pipeline.models import RawProduct
    from datetime import datetime, timezone

    product = RawProduct(
        external_id="ph-1",
        name="TestApp",
        slug="testapp",
        tagline="A cool app",
        description=None,
        url=None,
        category=None,
        launched_at=None,
    )
    repo = make_repo()
    repo.upsert_products = AsyncMock(return_value=1)
    ph = make_producthunt(products=[product])

    svc = make_service(repo=repo, producthunt=ph)
    await svc.run()

    repo.upsert_products.assert_called_once_with([product])


@pytest.mark.asyncio
async def test_stage_fetch_skips_upsert_when_producthunt_returns_empty():
    """No upsert_products call when Product Hunt returns empty list."""
    repo = make_repo()
    ph = make_producthunt(products=[])

    svc = make_service(repo=repo, producthunt=ph)
    await svc.run()

    repo.upsert_products.assert_not_called()


@pytest.mark.asyncio
async def test_stage_fetch_producthunt_error_recorded_continues():
    """Product Hunt failure should add error and let pipeline continue."""
    repo = make_repo()
    ph = make_producthunt()
    ph.fetch_recent_products = AsyncMock(side_effect=RuntimeError("PH API down"))

    svc = make_service(repo=repo, producthunt=ph)
    result = await svc.run()

    assert result.has_errors is True
    assert any("Product Hunt" in e for e in result.errors)
    # Pipeline should continue — subsequent stages should still be attempted
    repo.get_pending_posts.assert_called_once()


# ---------------------------------------------------------------------------
# Stage brief — trends and related-products exception paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stage_brief_trends_error_logs_and_continues():
    """When trends.get_interest raises, brief generation should still proceed."""
    posts = [make_post(id=1)]
    clusters_data = [(10, "SaaS", "Summary", posts)]
    draft = make_brief_draft("SaaS Brief")

    repo = make_repo()
    repo.get_clusters_without_briefs = AsyncMock(return_value=clusters_data)
    repo.find_related_products = AsyncMock(return_value=[])

    trends = make_trends()
    trends.get_interest = AsyncMock(side_effect=RuntimeError("trends API down"))

    llm = make_llm()
    llm.synthesize_brief = AsyncMock(return_value=draft)

    svc = make_service(repo=repo, trends=trends, llm=llm)
    result = await svc.run()

    # Brief should still be generated even without trends data
    assert result.briefs_generated == 1
    # synthesize_brief should have been called with trends_data=None
    call_args = llm.synthesize_brief.call_args
    assert call_args.kwargs.get("trends_data") is None


@pytest.mark.asyncio
async def test_stage_brief_related_products_error_logs_and_continues():
    """When find_related_products raises, brief generation should still proceed."""
    posts = [make_post(id=1)]
    clusters_data = [(10, "SaaS", "Summary", posts)]
    draft = make_brief_draft("SaaS Brief")

    repo = make_repo()
    repo.get_clusters_without_briefs = AsyncMock(return_value=clusters_data)
    repo.find_related_products = AsyncMock(side_effect=RuntimeError("DB error"))

    llm = make_llm()
    llm.synthesize_brief = AsyncMock(return_value=draft)

    svc = make_service(repo=repo, llm=llm)
    result = await svc.run()

    # Brief should still be generated even without related products
    assert result.briefs_generated == 1
    call_args = llm.synthesize_brief.call_args
    assert call_args.kwargs.get("related_products") is None


# ---------------------------------------------------------------------------
# Stage brief — keyword extraction stop-word fallback
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stage_brief_keywords_fallback_to_label_when_all_words_are_stop_words():
    """When every word in label+summary is a stop word or too short, the label
    itself is used as the sole keyword (service.py line 188 fallback branch)."""
    posts = [make_post(id=1)]
    # All words here are stop words from _TRENDS_STOP_WORDS or length <= 2:
    # "is", "in", "the", "or", "it", "on" are all in the stop-word set.
    clusters_data = [(10, "is", "in the or it on", posts)]
    draft = make_brief_draft("Fallback Brief")

    repo = make_repo()
    repo.get_clusters_without_briefs = AsyncMock(return_value=clusters_data)
    repo.find_related_products = AsyncMock(return_value=[])

    trends = make_trends()
    llm = make_llm()
    llm.synthesize_brief = AsyncMock(return_value=draft)

    svc = make_service(repo=repo, trends=trends, llm=llm)
    result = await svc.run()

    # Brief should still be generated using the label as the fallback keyword
    assert result.briefs_generated == 1
    # trends.get_interest should have been called with the label as the sole keyword
    trends.get_interest.assert_called_once_with(["is"])


# ---------------------------------------------------------------------------
# Stage fetch — App Store / Play Store max_age_days and fetch_new_apps
# ---------------------------------------------------------------------------


def make_appstore(*, products=None, new_apps=None, reviews=None) -> AsyncMock:
    appstore = AsyncMock()
    appstore.search_apps = AsyncMock(return_value=products if products is not None else [])
    appstore.fetch_new_apps = AsyncMock(return_value=new_apps if new_apps is not None else [])
    appstore.fetch_reviews = AsyncMock(return_value=reviews if reviews is not None else [])
    return appstore


def make_playstore(*, products=None, reviews=None) -> AsyncMock:
    playstore = AsyncMock()
    playstore.search_apps = AsyncMock(return_value=products if products is not None else [])
    playstore.fetch_reviews = AsyncMock(return_value=reviews if reviews is not None else [])
    return playstore


@pytest.mark.asyncio
async def test_stage_fetch_passes_max_age_days_to_appstore():
    from domain.pipeline.models import RawProduct

    appstore = make_appstore()
    svc = PipelineService(
        repo=make_repo(),
        reddit=make_reddit(),
        llm=make_llm(),
        rss=make_rss(),
        trends=make_trends(),
        producthunt=make_producthunt(),
        subreddits=["saas"],
        appstore=appstore,
        appstore_keywords=["todo"],
        appstore_max_age_days=180,
    )

    await svc.run()

    appstore.search_apps.assert_called_once_with(["todo"], max_age_days=180)


@pytest.mark.asyncio
async def test_stage_fetch_passes_max_age_days_to_playstore():
    playstore = make_playstore()
    svc = PipelineService(
        repo=make_repo(),
        reddit=make_reddit(),
        llm=make_llm(),
        rss=make_rss(),
        trends=make_trends(),
        producthunt=make_producthunt(),
        subreddits=["saas"],
        playstore=playstore,
        appstore_keywords=["todo"],
        appstore_max_age_days=180,
    )

    await svc.run()

    playstore.search_apps.assert_called_once_with(["todo"], max_age_days=180)


@pytest.mark.asyncio
async def test_stage_fetch_calls_fetch_new_apps():
    """fetch_new_apps must be called when App Store is configured."""
    appstore = make_appstore()
    svc = PipelineService(
        repo=make_repo(),
        reddit=make_reddit(),
        llm=make_llm(),
        rss=make_rss(),
        trends=make_trends(),
        producthunt=make_producthunt(),
        subreddits=["saas"],
        appstore=appstore,
        appstore_keywords=["todo"],
    )

    await svc.run()

    appstore.fetch_new_apps.assert_called_once()


@pytest.mark.asyncio
async def test_stage_fetch_deduplicates_search_and_new_apps():
    """Apps from fetch_new_apps that also appear in search should not be duplicated."""
    from domain.pipeline.models import RawProduct
    from datetime import datetime, timezone

    product = RawProduct(
        external_id="123",
        name="TestApp",
        slug="testapp-123",
        tagline=None,
        description=None,
        url=None,
        category=None,
        launched_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        source="app_store",
    )
    appstore = make_appstore(products=[product], new_apps=[product])
    repo = make_repo()
    repo.upsert_products = AsyncMock(return_value=1)

    svc = PipelineService(
        repo=repo,
        reddit=make_reddit(),
        llm=make_llm(),
        rss=make_rss(),
        trends=make_trends(),
        producthunt=make_producthunt(),
        subreddits=["saas"],
        appstore=appstore,
        appstore_keywords=["todo"],
    )

    await svc.run()

    # upsert_products should be called with 1 product (deduplicated)
    called_products = repo.upsert_products.call_args_list[0][0][0]
    assert len(called_products) == 1


@pytest.mark.asyncio
async def test_stage_fetch_new_apps_failure_does_not_block():
    """If fetch_new_apps fails, search results should still be processed."""
    from domain.pipeline.models import RawProduct
    from datetime import datetime, timezone

    product = RawProduct(
        external_id="123",
        name="TestApp",
        slug="testapp-123",
        tagline=None,
        description=None,
        url=None,
        category=None,
        launched_at=None,
        source="app_store",
    )
    appstore = make_appstore(products=[product])
    appstore.fetch_new_apps = AsyncMock(side_effect=RuntimeError("RSS down"))
    repo = make_repo()
    repo.upsert_products = AsyncMock(return_value=1)

    svc = PipelineService(
        repo=repo,
        reddit=make_reddit(),
        llm=make_llm(),
        rss=make_rss(),
        trends=make_trends(),
        producthunt=make_producthunt(),
        subreddits=["saas"],
        appstore=appstore,
        appstore_keywords=["todo"],
    )

    result = await svc.run()

    # Search results should still be upserted
    repo.upsert_products.assert_called()
    assert result.products_upserted >= 1


def test_pipeline_service_stores_max_age_days():
    svc = PipelineService(
        repo=make_repo(),
        reddit=make_reddit(),
        llm=make_llm(),
        rss=make_rss(),
        trends=make_trends(),
        producthunt=make_producthunt(),
        subreddits=["saas"],
        appstore_max_age_days=90,
    )

    assert svc._max_age_days == 90


def test_pipeline_service_default_max_age_days():
    svc = PipelineService(
        repo=make_repo(),
        reddit=make_reddit(),
        llm=make_llm(),
        rss=make_rss(),
        trends=make_trends(),
        producthunt=make_producthunt(),
        subreddits=["saas"],
    )

    assert svc._max_age_days == 365
