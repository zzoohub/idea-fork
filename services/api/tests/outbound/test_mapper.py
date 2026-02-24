"""Tests for outbound/postgres/mapper.py — all mapping functions."""
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from domain.brief.models import Brief
from domain.post.models import Post, PostTag
from domain.product.models import Product
from domain.rating.models import Rating
from domain.tag.models import Tag
from outbound.postgres.mapper import (
    brief_to_domain,
    post_to_domain,
    post_to_domain_no_tags,
    product_to_domain,
    rating_to_domain,
    tag_to_domain,
)


def _make_tag_row(id=1, slug="saas", name="SaaS"):
    row = MagicMock()
    row.id = id
    row.slug = slug
    row.name = name
    return row


def _make_post_row(
    id=1,
    title="Test Post",
    body="Test Body",
    source="reddit",
    subreddit="python",
    external_url="https://reddit.com/r/python/1",
    external_created_at=None,
    score=100,
    num_comments=20,
    post_type="complaint",
    sentiment="negative",
    tags=None,
):
    row = MagicMock()
    row.id = id
    row.title = title
    row.body = body
    row.source = source
    row.subreddit = subreddit
    row.external_url = external_url
    row.external_created_at = external_created_at or datetime(2026, 2, 18, tzinfo=timezone.utc)
    row.score = score
    row.num_comments = num_comments
    row.post_type = post_type
    row.sentiment = sentiment
    row.tags = tags if tags is not None else [_make_tag_row()]
    return row


def _make_product_row(
    id=1,
    slug="notion",
    name="Notion",
    description="A productivity tool",
    url="https://notion.so",
    image_url=None,
    category="Productivity",
    signal_count=10,
    trending_score=Decimal("8.5000"),
    tags=None,
):
    row = MagicMock()
    row.id = id
    row.slug = slug
    row.name = name
    row.description = description
    row.url = url
    row.image_url = image_url
    row.category = category
    row.signal_count = signal_count
    row.trending_score = trending_score
    row.tags = tags if tags is not None else []
    return row


def _make_brief_row(
    id=1,
    slug="test-brief",
    title="Test Brief",
    summary="Test summary",
    problem_statement="Test problem",
    opportunity="Test opportunity",
    status="published",
    published_at=None,
    source_count=10,
    upvote_count=5,
    downvote_count=1,
    demand_signals=None,
    solution_directions=None,
    source_snapshots=None,
):
    row = MagicMock()
    row.id = id
    row.slug = slug
    row.title = title
    row.summary = summary
    row.problem_statement = problem_statement
    row.opportunity = opportunity
    row.status = status
    row.published_at = published_at or datetime(2026, 2, 19, tzinfo=timezone.utc)
    row.source_count = source_count
    row.upvote_count = upvote_count
    row.downvote_count = downvote_count
    row.demand_signals = demand_signals if demand_signals is not None else {"post_count": 10}
    row.solution_directions = solution_directions if solution_directions is not None else ["Dir 1"]
    row.source_snapshots = source_snapshots if source_snapshots is not None else []
    return row


def _make_rating_row(
    id=1,
    brief_id=1,
    is_positive=True,
    feedback=None,
    created_at=None,
):
    row = MagicMock()
    row.id = id
    row.brief_id = brief_id
    row.is_positive = is_positive
    row.feedback = feedback
    row.created_at = created_at or datetime(2026, 2, 21, tzinfo=timezone.utc)
    return row


# ---------------------------------------------------------------------------
# tag_to_domain
# ---------------------------------------------------------------------------

def test_tag_to_domain_maps_fields():
    row = _make_tag_row(id=7, slug="fintech", name="Fintech")
    tag = tag_to_domain(row)

    assert isinstance(tag, Tag)
    assert tag.id == 7
    assert tag.slug == "fintech"
    assert tag.name == "Fintech"


# ---------------------------------------------------------------------------
# post_to_domain
# ---------------------------------------------------------------------------

def test_post_to_domain_maps_fields_with_tags():
    tag_row = _make_tag_row(id=2, slug="saas", name="SaaS")
    post_row = _make_post_row(id=42, tags=[tag_row])
    post = post_to_domain(post_row)

    assert isinstance(post, Post)
    assert post.id == 42
    assert post.title == "Test Post"
    assert post.body == "Test Body"
    assert post.source == "reddit"
    assert post.subreddit == "python"
    assert post.score == 100
    assert post.num_comments == 20
    assert post.sentiment == "negative"
    assert len(post.tags) == 1
    assert isinstance(post.tags[0], PostTag)
    assert post.tags[0].slug == "saas"
    assert post.tags[0].name == "SaaS"


def test_post_to_domain_maps_empty_tags():
    post_row = _make_post_row(tags=[])
    post = post_to_domain(post_row)

    assert post.tags == []


def test_post_to_domain_maps_optional_fields_as_none():
    post_row = _make_post_row(body=None, subreddit=None, sentiment=None)
    post = post_to_domain(post_row)

    assert post.body is None
    assert post.subreddit is None
    assert post.sentiment is None


# ---------------------------------------------------------------------------
# post_to_domain_no_tags
# ---------------------------------------------------------------------------

def test_post_to_domain_no_tags_returns_empty_tags():
    tag_row = _make_tag_row()
    post_row = _make_post_row(tags=[tag_row])
    post = post_to_domain_no_tags(post_row)

    assert isinstance(post, Post)
    # Tags should always be empty regardless of row.tags
    assert post.tags == []
    assert post.id == post_row.id


# ---------------------------------------------------------------------------
# brief_to_domain
# ---------------------------------------------------------------------------

def test_brief_to_domain_maps_all_fields():
    brief_row = _make_brief_row(
        id=5,
        slug="opportunity-slug",
        title="My Brief",
        summary="A summary",
        problem_statement="The problem",
        opportunity="The opportunity",
        status="published",
        source_count=25,
        upvote_count=15,
        downvote_count=3,
        demand_signals={"post_count": 25},
        solution_directions=["Dir 1", "Dir 2"],
        source_snapshots=[{"post_id": 1}],
    )
    brief = brief_to_domain(brief_row)

    assert isinstance(brief, Brief)
    assert brief.id == 5
    assert brief.slug == "opportunity-slug"
    assert brief.title == "My Brief"
    assert brief.summary == "A summary"
    assert brief.problem_statement == "The problem"
    assert brief.opportunity == "The opportunity"
    assert brief.status == "published"
    assert brief.source_count == 25
    assert brief.upvote_count == 15
    assert brief.downvote_count == 3
    assert brief.demand_signals == {"post_count": 25}
    assert brief.solution_directions == ["Dir 1", "Dir 2"]
    assert brief.source_snapshots == [{"post_id": 1}]


def test_brief_to_domain_published_at_none():
    brief_row = _make_brief_row(published_at=None)
    brief_row.published_at = None  # explicitly override mock
    brief = brief_to_domain(brief_row)
    assert brief.published_at is None


# ---------------------------------------------------------------------------
# product_to_domain
# ---------------------------------------------------------------------------

def test_product_to_domain_maps_fields():
    product_row = _make_product_row(
        id=3,
        slug="notion",
        name="Notion",
        description="Workspace tool",
        url="https://notion.so",
        image_url="https://notion.so/icon.png",
        category="Productivity",
        signal_count=50,
        trending_score=Decimal("9.1234"),
    )
    product = product_to_domain(product_row)

    assert isinstance(product, Product)
    assert product.id == 3
    assert product.slug == "notion"
    assert product.name == "Notion"
    assert product.description == "Workspace tool"
    assert product.url == "https://notion.so"
    assert product.image_url == "https://notion.so/icon.png"
    assert product.category == "Productivity"
    assert product.signal_count == 50
    assert isinstance(product.trending_score, float)
    assert abs(product.trending_score - 9.1234) < 0.0001


def test_product_to_domain_optional_fields_as_none():
    product_row = _make_product_row(description=None, url=None, image_url=None, category=None)
    product = product_to_domain(product_row)

    assert product.description is None
    assert product.url is None
    assert product.image_url is None
    assert product.category is None


def test_product_to_domain_maps_tags_to_post_tags():
    """product_to_domain must convert each TagRow into a PostTag(slug, name)."""
    tag1 = _make_tag_row(id=10, slug="productivity", name="Productivity")
    tag2 = _make_tag_row(id=11, slug="saas", name="SaaS")
    product_row = _make_product_row(tags=[tag1, tag2])
    product = product_to_domain(product_row)

    assert len(product.tags) == 2
    assert isinstance(product.tags[0], PostTag)
    assert product.tags[0].slug == "productivity"
    assert product.tags[0].name == "Productivity"
    assert isinstance(product.tags[1], PostTag)
    assert product.tags[1].slug == "saas"
    assert product.tags[1].name == "SaaS"


def test_product_to_domain_empty_tags_gives_empty_list():
    """When the product row has no tags, the domain object tags should be []."""
    product_row = _make_product_row(tags=[])
    product = product_to_domain(product_row)

    assert product.tags == []


# ---------------------------------------------------------------------------
# rating_to_domain
# ---------------------------------------------------------------------------

def test_rating_to_domain_maps_fields():
    created = datetime(2026, 2, 21, 10, 30, tzinfo=timezone.utc)
    rating_row = _make_rating_row(id=9, brief_id=2, is_positive=False, feedback="Too vague", created_at=created)
    rating = rating_to_domain(rating_row)

    assert isinstance(rating, Rating)
    assert rating.id == 9
    assert rating.brief_id == 2
    assert rating.is_positive is False
    assert rating.feedback == "Too vague"
    assert rating.created_at == created


def test_rating_to_domain_no_feedback():
    rating_row = _make_rating_row(feedback=None)
    rating = rating_to_domain(rating_row)
    assert rating.feedback is None
