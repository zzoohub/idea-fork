from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from domain.brief.models import Brief
from domain.brief.service import BriefService
from domain.post.models import Post, PostTag
from domain.post.service import PostService
from domain.product.models import Product, ProductMetrics
from domain.product.service import ProductService
from domain.rating.service import RatingService
from domain.tag.models import Tag
from domain.tag.service import TagService
from inbound.http.brief.router import router as brief_router
from inbound.http.errors import register_exception_handlers
from inbound.http.post.router import router as post_router
from inbound.http.product.router import router as product_router
from inbound.http.rating.router import router as rating_router
from inbound.http.tag.router import router as tag_router


def _stub_repos():
    tag_repo = AsyncMock()
    tag_repo.list_tags = AsyncMock(return_value=[])

    post_repo = AsyncMock()
    post_repo.list_posts = AsyncMock(return_value=[])
    post_repo.get_post = AsyncMock(return_value=None)

    brief_repo = AsyncMock()
    brief_repo.list_briefs = AsyncMock(return_value=[])
    brief_repo.get_brief_by_slug = AsyncMock(return_value=None)
    brief_repo.get_brief_by_id = AsyncMock(return_value=None)

    product_repo = AsyncMock()
    product_repo.list_products = AsyncMock(return_value=[])
    product_repo.get_product_by_slug = AsyncMock(return_value=None)
    product_repo.get_product_posts = AsyncMock(return_value=[])
    product_repo.get_product_metrics = AsyncMock(
        return_value=ProductMetrics(total_mentions=0, negative_count=0, sentiment_score=0)
    )
    product_repo.get_related_briefs = AsyncMock(return_value=[])

    rating_repo = AsyncMock()
    rating_repo.create_rating = AsyncMock(return_value=None)
    rating_repo.update_rating = AsyncMock(return_value=None)

    return tag_repo, post_repo, brief_repo, product_repo, rating_repo


def build_test_app(
    tag_repo=None,
    post_repo=None,
    brief_repo=None,
    product_repo=None,
    rating_repo=None,
):
    repos = _stub_repos()
    tag_r = tag_repo or repos[0]
    post_r = post_repo or repos[1]
    brief_r = brief_repo or repos[2]
    product_r = product_repo or repos[3]
    rating_r = rating_repo or repos[4]

    tag_service = TagService(tag_r)
    post_service = PostService(post_r)
    brief_service = BriefService(brief_r)
    product_service = ProductService(product_r)
    rating_service = RatingService(rating_r, brief_r)

    app = FastAPI()
    register_exception_handlers(app)

    @app.middleware("http")
    async def inject_services(request, call_next):
        request.state.tag_service = tag_service
        request.state.post_service = post_service
        request.state.brief_service = brief_service
        request.state.product_service = product_service
        request.state.rating_service = rating_service
        return await call_next(request)

    app.include_router(tag_router, prefix="/v1")
    app.include_router(post_router, prefix="/v1")
    app.include_router(brief_router, prefix="/v1")
    app.include_router(product_router, prefix="/v1")
    app.include_router(rating_router, prefix="/v1")

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


@pytest.fixture
def stub_repos():
    return _stub_repos()


@pytest.fixture
async def client():
    app = build_test_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


def make_tag(id=1, slug="saas", name="SaaS"):
    return Tag(id=id, slug=slug, name=name)


def make_post(
    id=1,
    title="Test post",
    body="Test body",
    source="reddit",
    subreddit="test",
    external_url="https://reddit.com/r/test/1",
    score=10,
    num_comments=5,
    sentiment="negative",
    tags=None,
):
    from datetime import datetime, timezone

    return Post(
        id=id,
        title=title,
        body=body,
        source=source,
        subreddit=subreddit,
        external_url=external_url,
        external_created_at=datetime(2026, 2, 18, 14, 22, tzinfo=timezone.utc),
        score=score,
        num_comments=num_comments,
        sentiment=sentiment,
        tags=tags or [PostTag(slug="saas", name="SaaS")],
    )


def make_brief(
    id=1,
    slug="test-brief",
    title="Test Brief",
    summary="Test summary",
    problem_statement="Test problem",
    opportunity="Test opportunity",
    status="published",
    source_count=10,
    upvote_count=5,
    downvote_count=1,
):
    from datetime import datetime, timezone

    return Brief(
        id=id,
        slug=slug,
        title=title,
        summary=summary,
        problem_statement=problem_statement,
        opportunity=opportunity,
        status=status,
        published_at=datetime(2026, 2, 19, 8, 0, tzinfo=timezone.utc),
        source_count=source_count,
        upvote_count=upvote_count,
        downvote_count=downvote_count,
        demand_signals={"post_count": 10, "subreddit_count": 3},
        solution_directions=["Direction 1", "Direction 2"],
        source_snapshots=[{"post_id": 1, "title": "Test", "snippet": "...", "external_url": "https://example.com", "subreddit": "test", "score": 10}],
    )


def make_product(
    id=1,
    slug="notion",
    name="Notion",
    category="Productivity",
    signal_count=10,
    trending_score=8.5,
    tags=None,
    launched_at=None,
):
    return Product(
        id=id,
        slug=slug,
        name=name,
        source="producthunt",
        external_id=f"ph-{id}",
        tagline="One workspace. Every team.",
        description="Test product",
        url="https://notion.so",
        image_url=None,
        category=category,
        launched_at=launched_at,
        signal_count=signal_count,
        trending_score=trending_score,
        tags=tags or [],
    )
