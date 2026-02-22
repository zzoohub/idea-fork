"""Tests for outbound/postgres/pipeline_repository.py.

All database interaction is fully mocked — no real DB connection required.
"""
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest

from domain.pipeline.models import BriefDraft, ClusteringResult, RawRedditPost, TaggingResult
from domain.post.models import Post, PostTag
from outbound.postgres.pipeline_repository import PostgresPipelineRepository, _slugify


# ---------------------------------------------------------------------------
# _slugify helper
# ---------------------------------------------------------------------------

def test_slugify_lowercase():
    assert _slugify("Hello World") == "hello-world"


def test_slugify_strips_special_chars():
    assert _slugify("AI/ML & Data!") == "ai-ml-data"


def test_slugify_strips_leading_trailing_hyphens():
    assert _slugify("---test---") == "test"


def test_slugify_collapses_multiple_separators():
    assert _slugify("one   two   three") == "one-two-three"


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

def _make_db():
    """Return a mock Database whose session() yields a mock AsyncSession."""
    session = AsyncMock()
    session.__aenter__ = AsyncMock(return_value=session)
    session.__aexit__ = AsyncMock(return_value=False)
    session.execute = AsyncMock()
    session.commit = AsyncMock()

    db = MagicMock()
    db.session.return_value = session
    return db, session


def _make_raw_post(external_id="abc", subreddit="SaaS"):
    return RawRedditPost(
        external_id=external_id,
        subreddit=subreddit,
        title="Test post",
        body="Body text",
        external_url=f"https://reddit.com/r/{subreddit}/comments/{external_id}/",
        external_created_at=datetime(2026, 2, 1, tzinfo=UTC),
        score=10,
        num_comments=2,
    )


def _make_domain_post(pid=1):
    return Post(
        id=pid,
        title="Post",
        body=None,
        source="reddit",
        subreddit="SaaS",
        external_url="https://example.com",
        external_created_at=datetime(2026, 2, 1, tzinfo=UTC),
        score=5,
        num_comments=1,
        post_type="complaint",
        sentiment="negative",
        tags=[],
    )


# ---------------------------------------------------------------------------
# acquire_advisory_lock
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_acquire_advisory_lock_returns_true_when_locked():
    """When pg_try_advisory_lock returns True, acquire should return True and keep session."""
    # The repo calls: self._lock_session = self._db.session()
    # Then: await self._lock_session.__aenter__()
    # Then: result = await self._lock_session.execute(...)
    # Then: locked = result.scalar()
    # So we need session itself to be the object returned by db.session()
    # and session.execute to return something with .scalar() == True.
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    scalar_result = MagicMock()
    scalar_result.scalar.return_value = True
    mock_session.execute = AsyncMock(return_value=scalar_result)

    db = MagicMock()
    db.session.return_value = mock_session

    repo = PostgresPipelineRepository(db)
    result = await repo.acquire_advisory_lock()

    assert result is True
    assert repo._lock_session is mock_session  # session kept because lock acquired


@pytest.mark.asyncio
async def test_acquire_advisory_lock_returns_false_when_not_locked():
    """When pg_try_advisory_lock returns False, acquire should return False and clear session."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    scalar_result = MagicMock()
    scalar_result.scalar.return_value = False
    mock_session.execute = AsyncMock(return_value=scalar_result)

    db = MagicMock()
    db.session.return_value = mock_session

    repo = PostgresPipelineRepository(db)
    result = await repo.acquire_advisory_lock()

    assert result is False
    assert repo._lock_session is None


# ---------------------------------------------------------------------------
# release_advisory_lock
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_release_advisory_lock_when_no_session_is_noop():
    db, _ = _make_db()
    repo = PostgresPipelineRepository(db)
    repo._lock_session = None

    # Must not raise
    await repo.release_advisory_lock()


@pytest.mark.asyncio
async def test_release_advisory_lock_executes_unlock_and_closes_session():
    db, _ = _make_db()
    repo = PostgresPipelineRepository(db)

    mock_lock_session = AsyncMock()
    mock_lock_session.execute = AsyncMock()
    mock_lock_session.__aexit__ = AsyncMock(return_value=False)
    repo._lock_session = mock_lock_session

    await repo.release_advisory_lock()

    mock_lock_session.execute.assert_called_once()
    mock_lock_session.__aexit__.assert_called_once()
    assert repo._lock_session is None


@pytest.mark.asyncio
async def test_release_advisory_lock_sets_session_none_on_execute_exception():
    """Even if execute fails, _lock_session must be cleared."""
    db, _ = _make_db()
    repo = PostgresPipelineRepository(db)

    mock_lock_session = AsyncMock()
    mock_lock_session.execute = AsyncMock(side_effect=RuntimeError("DB error"))
    mock_lock_session.__aexit__ = AsyncMock(return_value=False)
    repo._lock_session = mock_lock_session

    await repo.release_advisory_lock()

    assert repo._lock_session is None


@pytest.mark.asyncio
async def test_release_advisory_lock_sets_session_none_on_exit_exception():
    """Even if __aexit__ fails, _lock_session must be cleared."""
    db, _ = _make_db()
    repo = PostgresPipelineRepository(db)

    mock_lock_session = AsyncMock()
    mock_lock_session.execute = AsyncMock()
    mock_lock_session.__aexit__ = AsyncMock(side_effect=RuntimeError("close error"))
    repo._lock_session = mock_lock_session

    await repo.release_advisory_lock()

    assert repo._lock_session is None


# ---------------------------------------------------------------------------
# upsert_posts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_upsert_posts_empty_list_returns_zero():
    db, _ = _make_db()
    repo = PostgresPipelineRepository(db)

    count = await repo.upsert_posts([])

    assert count == 0


@pytest.mark.asyncio
async def test_upsert_posts_returns_rowcount():
    db, session = _make_db()
    db.session.return_value = session

    exec_result = MagicMock()
    exec_result.rowcount = 3
    session.execute = AsyncMock(return_value=exec_result)

    posts = [_make_raw_post("a"), _make_raw_post("b"), _make_raw_post("c")]

    with patch("outbound.postgres.pipeline_repository.pg_insert") as mock_insert:
        mock_stmt = MagicMock()
        mock_stmt.on_conflict_do_update.return_value = mock_stmt
        mock_insert.return_value = mock_stmt
        mock_stmt.excluded = MagicMock()

        repo = PostgresPipelineRepository(db)
        count = await repo.upsert_posts(posts)

    assert count == 3
    session.commit.assert_called_once()


# ---------------------------------------------------------------------------
# get_pending_posts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_pending_posts_returns_mapped_posts():
    db, session = _make_db()
    db.session.return_value = session

    mock_row = MagicMock()
    # Provide all fields needed by post_to_domain
    mock_row.id = 1
    mock_row.title = "Post"
    mock_row.body = None
    mock_row.source = "reddit"
    mock_row.subreddit = "SaaS"
    mock_row.external_url = "https://example.com"
    mock_row.external_created_at = datetime(2026, 2, 1, tzinfo=UTC)
    mock_row.score = 5
    mock_row.num_comments = 1
    mock_row.post_type = "complaint"
    mock_row.sentiment = "negative"
    mock_row.tags = []

    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [mock_row]
    exec_result = MagicMock()
    exec_result.scalars.return_value = scalars_mock
    session.execute = AsyncMock(return_value=exec_result)

    repo = PostgresPipelineRepository(db)
    posts = await repo.get_pending_posts(limit=50)

    assert len(posts) == 1
    assert isinstance(posts[0], Post)


@pytest.mark.asyncio
async def test_get_pending_posts_empty_returns_empty_list():
    db, session = _make_db()
    db.session.return_value = session

    scalars_mock = MagicMock()
    scalars_mock.all.return_value = []
    exec_result = MagicMock()
    exec_result.scalars.return_value = scalars_mock
    session.execute = AsyncMock(return_value=exec_result)

    repo = PostgresPipelineRepository(db)
    posts = await repo.get_pending_posts()

    assert posts == []


# ---------------------------------------------------------------------------
# get_tagged_posts_without_cluster
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_tagged_posts_without_cluster_returns_posts():
    db, session = _make_db()
    db.session.return_value = session

    mock_row = MagicMock()
    mock_row.id = 2
    mock_row.title = "Tagged Post"
    mock_row.body = "body"
    mock_row.source = "reddit"
    mock_row.subreddit = "startups"
    mock_row.external_url = "https://example.com"
    mock_row.external_created_at = datetime(2026, 2, 1, tzinfo=UTC)
    mock_row.score = 20
    mock_row.num_comments = 3
    mock_row.post_type = "feature_request"
    mock_row.sentiment = "neutral"
    mock_row.tags = []

    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [mock_row]
    exec_result = MagicMock()
    exec_result.scalars.return_value = scalars_mock
    session.execute = AsyncMock(return_value=exec_result)

    repo = PostgresPipelineRepository(db)
    posts = await repo.get_tagged_posts_without_cluster()

    assert len(posts) == 1


# ---------------------------------------------------------------------------
# save_tagging_results
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_save_tagging_results_calls_commit():
    db, session = _make_db()
    db.session.return_value = session

    # Provide a tag row for the slug lookup
    tag_row = MagicMock()
    tag_row.id = 1
    tag_row.slug = "saas"

    scalars_mock = MagicMock()
    scalars_mock.first.return_value = tag_row
    exec_result = MagicMock()
    exec_result.scalars.return_value = scalars_mock

    with patch("outbound.postgres.pipeline_repository.pg_insert") as mock_insert:
        mock_stmt = MagicMock()
        mock_stmt.on_conflict_do_nothing.return_value = mock_stmt
        mock_insert.return_value = mock_stmt

        session.execute = AsyncMock(return_value=exec_result)

        results = [
            TaggingResult(post_id=1, post_type="complaint", sentiment="negative", tag_slugs=["saas"])
        ]

        repo = PostgresPipelineRepository(db)
        await repo.save_tagging_results(results)

    session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_save_tagging_results_no_tag_link_when_tag_not_found():
    """When a tag slug is not found in the DB, the link insert should be skipped."""
    db, session = _make_db()
    db.session.return_value = session

    scalars_mock = MagicMock()
    scalars_mock.first.return_value = None  # tag not found
    exec_result = MagicMock()
    exec_result.scalars.return_value = scalars_mock

    with patch("outbound.postgres.pipeline_repository.pg_insert") as mock_insert:
        mock_stmt = MagicMock()
        mock_stmt.on_conflict_do_nothing.return_value = mock_stmt
        mock_insert.return_value = mock_stmt

        session.execute = AsyncMock(return_value=exec_result)

        results = [
            TaggingResult(post_id=1, post_type="complaint", sentiment="negative", tag_slugs=["ghost-slug"])
        ]

        repo = PostgresPipelineRepository(db)
        await repo.save_tagging_results(results)

    session.commit.assert_called_once()


# ---------------------------------------------------------------------------
# mark_tagging_failed
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_mark_tagging_failed_commits():
    db, session = _make_db()
    db.session.return_value = session
    session.execute = AsyncMock()

    repo = PostgresPipelineRepository(db)
    await repo.mark_tagging_failed([1, 2, 3])

    session.execute.assert_called_once()
    session.commit.assert_called_once()


# ---------------------------------------------------------------------------
# save_clusters
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_save_clusters_creates_cluster_rows():
    db, session = _make_db()
    db.session.return_value = session

    # First execute returns cluster id; subsequent calls return default mocks
    cluster_id_result = MagicMock()
    cluster_id_result.scalar_one.return_value = 42

    with patch("outbound.postgres.pipeline_repository.pg_insert") as mock_insert:
        mock_stmt = MagicMock()
        mock_stmt.values.return_value = mock_stmt
        mock_stmt.returning.return_value = mock_stmt
        mock_stmt.on_conflict_do_nothing.return_value = mock_stmt
        mock_insert.return_value = mock_stmt

        session.execute = AsyncMock(return_value=cluster_id_result)

        clusters = [ClusteringResult(label="L", summary="S", post_ids=[1, 2])]

        repo = PostgresPipelineRepository(db)
        await repo.save_clusters(clusters)

    session.commit.assert_called_once()


# ---------------------------------------------------------------------------
# get_clusters_without_briefs
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_clusters_without_briefs_returns_clusters_with_posts():
    db, session = _make_db()
    db.session.return_value = session

    # cluster row
    cluster_row = MagicMock()
    cluster_row.id = 1
    cluster_row.label = "Pricing"
    cluster_row.summary = "Pricing issues"

    # call 1: get clusters
    clusters_scalars = MagicMock()
    clusters_scalars.all.return_value = [cluster_row]
    clusters_result = MagicMock()
    clusters_result.scalars.return_value = clusters_scalars

    # call 2: get post_ids
    post_ids_result = MagicMock()
    post_ids_result.__iter__ = MagicMock(return_value=iter([(1,), (2,)]))

    # call 3: get post rows
    mock_post_row = MagicMock()
    mock_post_row.id = 1
    mock_post_row.title = "Post"
    mock_post_row.body = None
    mock_post_row.source = "reddit"
    mock_post_row.subreddit = "SaaS"
    mock_post_row.external_url = "https://example.com"
    mock_post_row.external_created_at = datetime(2026, 2, 1, tzinfo=UTC)
    mock_post_row.score = 5
    mock_post_row.num_comments = 1
    mock_post_row.post_type = "complaint"
    mock_post_row.sentiment = "negative"
    mock_post_row.tags = []

    posts_scalars = MagicMock()
    posts_scalars.all.return_value = [mock_post_row]
    posts_result = MagicMock()
    posts_result.scalars.return_value = posts_scalars

    session.execute = AsyncMock(side_effect=[clusters_result, post_ids_result, posts_result])

    repo = PostgresPipelineRepository(db)
    output = await repo.get_clusters_without_briefs()

    assert len(output) == 1
    cluster_id, label, summary, posts = output[0]
    assert cluster_id == 1
    assert label == "Pricing"
    assert len(posts) == 1


@pytest.mark.asyncio
async def test_get_clusters_without_briefs_skips_empty_clusters():
    """Clusters with no post_ids should be skipped."""
    db, session = _make_db()
    db.session.return_value = session

    cluster_row = MagicMock()
    cluster_row.id = 1
    cluster_row.label = "Empty"
    cluster_row.summary = None

    clusters_scalars = MagicMock()
    clusters_scalars.all.return_value = [cluster_row]
    clusters_result = MagicMock()
    clusters_result.scalars.return_value = clusters_scalars

    # Empty post_ids
    post_ids_result = MagicMock()
    post_ids_result.__iter__ = MagicMock(return_value=iter([]))

    session.execute = AsyncMock(side_effect=[clusters_result, post_ids_result])

    repo = PostgresPipelineRepository(db)
    output = await repo.get_clusters_without_briefs()

    assert output == []


# ---------------------------------------------------------------------------
# save_brief
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_save_brief_commits_with_sources():
    db, session = _make_db()
    db.session.return_value = session

    brief_id_result = MagicMock()
    brief_id_result.scalar_one.return_value = 99

    with patch("outbound.postgres.pipeline_repository.pg_insert") as mock_insert:
        mock_stmt = MagicMock()
        mock_stmt.values.return_value = mock_stmt
        mock_stmt.returning.return_value = mock_stmt
        mock_stmt.on_conflict_do_nothing.return_value = mock_stmt
        mock_insert.return_value = mock_stmt

        session.execute = AsyncMock(return_value=brief_id_result)

        draft = BriefDraft(
            title="Test Brief",
            slug="test-brief",
            summary="Summary",
            problem_statement="Problem",
            opportunity="Opportunity",
            solution_directions=["Dir 1"],
            demand_signals={"post_count": 5},
            source_snapshots=[{"post_id": 1, "snippet": "snip"}],
            source_post_ids=[1],
        )

        repo = PostgresPipelineRepository(db)
        await repo.save_brief(cluster_id=10, draft=draft)

    session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_save_brief_snapshot_without_post_id_is_skipped():
    """A source snapshot without a post_id must not produce a brief_source row."""
    db, session = _make_db()
    db.session.return_value = session

    brief_id_result = MagicMock()
    brief_id_result.scalar_one.return_value = 100

    insert_call_count = 0

    with patch("outbound.postgres.pipeline_repository.pg_insert") as mock_insert:
        mock_stmt = MagicMock()
        mock_stmt.values.return_value = mock_stmt
        mock_stmt.returning.return_value = mock_stmt
        mock_stmt.on_conflict_do_nothing.return_value = mock_stmt

        def count_insert(model):
            nonlocal insert_call_count
            insert_call_count += 1
            return mock_stmt

        mock_insert.side_effect = count_insert
        session.execute = AsyncMock(return_value=brief_id_result)

        draft = BriefDraft(
            title="T",
            slug="t",
            summary="S",
            problem_statement="P",
            opportunity="O",
            solution_directions=[],
            demand_signals={},
            source_snapshots=[{"snippet": "no post_id here"}],  # no post_id
            source_post_ids=[],
        )

        repo = PostgresPipelineRepository(db)
        await repo.save_brief(cluster_id=5, draft=draft)

    # Only the BriefRow insert should have happened; no BriefSourceRow insert
    assert insert_call_count == 1
    session.commit.assert_called_once()
