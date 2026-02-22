"""Tests for outbound/postgres/models.py — SQLAlchemy ORM model instantiation."""
from datetime import datetime, timezone

from outbound.postgres.models import (
    BriefRow,
    BriefSourceRow,
    PostRow,
    PostTagRow,
    ProductPostRow,
    ProductRow,
    RatingRow,
    TagRow,
)


def test_tag_row_tablename_and_columns():
    assert TagRow.__tablename__ == "tag"
    row = TagRow(id=1, name="SaaS", slug="saas")
    assert row.id == 1
    assert row.name == "SaaS"
    assert row.slug == "saas"


def test_post_tag_row_tablename():
    assert PostTagRow.__tablename__ == "post_tag"
    row = PostTagRow(post_id=1, tag_id=2)
    assert row.post_id == 1
    assert row.tag_id == 2


def test_post_row_tablename_and_columns():
    assert PostRow.__tablename__ == "post"
    now = datetime(2026, 2, 18, tzinfo=timezone.utc)
    row = PostRow(
        id=10,
        created_at=now,
        external_created_at=now,
        score=50,
        num_comments=10,
        source="reddit",
        external_id="abc123",
        subreddit="python",
        title="Test Post",
        body="Body text",
        external_url="https://reddit.com/r/python/1",
        post_type="complaint",
        sentiment="negative",
    )
    assert row.id == 10
    assert row.title == "Test Post"
    assert row.body == "Body text"
    assert row.source == "reddit"
    assert row.subreddit == "python"
    assert row.post_type == "complaint"
    assert row.sentiment == "negative"


def test_post_row_optional_fields_default_none():
    now = datetime(2026, 2, 18, tzinfo=timezone.utc)
    row = PostRow(
        id=11,
        created_at=now,
        external_created_at=now,
        external_id="xyz",
        title="Minimal",
        external_url="https://example.com",
    )
    assert row.deleted_at is None
    assert row.subreddit is None
    assert row.body is None
    assert row.post_type is None
    assert row.sentiment is None


def test_product_post_row_tablename():
    assert ProductPostRow.__tablename__ == "product_post"
    row = ProductPostRow(product_id=5, post_id=10)
    assert row.product_id == 5
    assert row.post_id == 10


def test_product_row_tablename_and_columns():
    assert ProductRow.__tablename__ == "product"
    now = datetime(2026, 2, 18, tzinfo=timezone.utc)
    row = ProductRow(
        id=1,
        created_at=now,
        updated_at=now,
        launched_at=now,
        complaint_count=20,
        trending_score=8.5,
        source="producthunt",
        external_id="notion-1",
        name="Notion",
        slug="notion",
        tagline="One workspace. Every team.",
        description="A tool",
        url="https://notion.so",
        image_url=None,
        category="Productivity",
    )
    assert row.id == 1
    assert row.name == "Notion"
    assert row.slug == "notion"
    assert row.source == "producthunt"
    assert row.external_id == "notion-1"
    assert row.tagline == "One workspace. Every team."
    assert row.description == "A tool"
    assert row.url == "https://notion.so"
    assert row.image_url is None
    assert row.category == "Productivity"
    assert row.complaint_count == 20
    assert row.launched_at == now


def test_product_row_optional_fields_default_none():
    now = datetime(2026, 2, 18, tzinfo=timezone.utc)
    row = ProductRow(
        id=2,
        created_at=now,
        updated_at=now,
        external_id="min-1",
        name="MinimalProduct",
        slug="minimal-product",
    )
    assert row.launched_at is None
    assert row.tagline is None
    assert row.description is None
    assert row.url is None
    assert row.image_url is None
    assert row.category is None


def test_brief_row_tablename_and_columns():
    assert BriefRow.__tablename__ == "brief"
    now = datetime(2026, 2, 19, tzinfo=timezone.utc)
    row = BriefRow(
        id=1,
        created_at=now,
        updated_at=now,
        published_at=now,
        source_count=10,
        upvote_count=5,
        downvote_count=1,
        title="My Brief",
        slug="my-brief",
        summary="A summary",
        problem_statement="The problem",
        opportunity="The opportunity",
        status="published",
        demand_signals={"post_count": 10},
        solution_directions=["Dir 1"],
        source_snapshots=[{"post_id": 1}],
    )
    assert row.id == 1
    assert row.slug == "my-brief"
    assert row.title == "My Brief"
    assert row.status == "published"
    assert row.demand_signals == {"post_count": 10}
    assert row.solution_directions == ["Dir 1"]


def test_brief_row_optional_published_at():
    now = datetime(2026, 2, 19, tzinfo=timezone.utc)
    row = BriefRow(
        id=2,
        created_at=now,
        updated_at=now,
        source_count=0,
        upvote_count=0,
        downvote_count=0,
        title="Pending Brief",
        slug="pending-brief",
        summary="...",
        problem_statement="...",
        opportunity="...",
        status="pending",
        demand_signals={},
        solution_directions=[],
        source_snapshots=[],
    )
    assert row.published_at is None
    assert row.cluster_id is None


def test_brief_source_row_tablename():
    assert BriefSourceRow.__tablename__ == "brief_source"
    row = BriefSourceRow(brief_id=1, post_id=2, snippet="A snippet")
    assert row.brief_id == 1
    assert row.post_id == 2
    assert row.snippet == "A snippet"


def test_brief_source_row_optional_snippet():
    row = BriefSourceRow(brief_id=1, post_id=2)
    assert row.snippet is None


def test_rating_row_tablename_and_columns():
    assert RatingRow.__tablename__ == "rating"
    now = datetime(2026, 2, 21, tzinfo=timezone.utc)
    row = RatingRow(
        id=1,
        created_at=now,
        brief_id=1,
        is_positive=True,
        session_id="session-abc",
        feedback="Great!",
    )
    assert row.id == 1
    assert row.brief_id == 1
    assert row.is_positive is True
    assert row.session_id == "session-abc"
    assert row.feedback == "Great!"


def test_rating_row_optional_feedback():
    now = datetime(2026, 2, 21, tzinfo=timezone.utc)
    row = RatingRow(
        id=2,
        created_at=now,
        brief_id=1,
        is_positive=False,
        session_id="session-xyz",
    )
    assert row.feedback is None
