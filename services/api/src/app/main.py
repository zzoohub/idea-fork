from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from starlette.responses import JSONResponse, Response

from domain.brief.service import BriefService
from domain.pipeline.service import PipelineService
from domain.post.service import PostService
from domain.product.service import ProductService
from domain.rating.service import RatingService
from domain.tag.service import TagService
from inbound.http.brief.router import router as brief_router
from inbound.http.errors import register_exception_handlers
from inbound.http.limiter import limiter
from inbound.http.pipeline.router import router as pipeline_router
from inbound.http.post.router import router as post_router
from inbound.http.product.router import router as product_router
from inbound.http.rating.router import router as rating_router
from inbound.http.tag.router import router as tag_router
from outbound.appstore.client import AppStoreClient
from outbound.llm.client import GeminiLlmClient
from outbound.playstore.client import PlayStoreClient
from outbound.postgres.brief_repository import PostgresBriefRepository
from outbound.postgres.database import Database
from outbound.postgres.pipeline_repository import PostgresPipelineRepository
from outbound.postgres.post_repository import PostgresPostRepository
from outbound.postgres.product_repository import PostgresProductRepository
from outbound.postgres.rating_repository import PostgresRatingRepository
from outbound.postgres.tag_repository import PostgresTagRepository
from outbound.producthunt.client import ProductHuntApiClient
from outbound.reddit.client import RedditApiClient
from outbound.rss.client import RssFeedClient
from outbound.trends.client import GoogleTrendsClient
from shared.config import Settings, get_settings


def _init_sentry(settings: Settings) -> None:
    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.SENTRY_ENVIRONMENT,
            traces_sample_rate=0.0,
            enable_tracing=False,
            send_default_pii=False,
        )


def _create_repositories(db: Database) -> dict:
    tag_repo = PostgresTagRepository(db)
    post_repo = PostgresPostRepository(db)
    brief_repo = PostgresBriefRepository(db)
    product_repo = PostgresProductRepository(db)
    rating_repo = PostgresRatingRepository(db)
    pipeline_repo = PostgresPipelineRepository(db)
    return {
        "tag": tag_repo,
        "post": post_repo,
        "brief": brief_repo,
        "product": product_repo,
        "rating": rating_repo,
        "pipeline": pipeline_repo,
    }


def _create_services(repos: dict) -> dict:
    return {
        "tag_service": TagService(repos["tag"]),
        "post_service": PostService(repos["post"]),
        "brief_service": BriefService(repos["brief"]),
        "product_service": ProductService(repos["product"]),
        "rating_service": RatingService(repos["rating"], repos["brief"]),
    }


def _parse_csv(value: str) -> list[str]:
    return [s.strip() for s in value.split(",") if s.strip()]


def _create_pipeline_service(settings: Settings, repos: dict) -> PipelineService:
    reddit_client = RedditApiClient(user_agent=settings.REDDIT_USER_AGENT)
    llm_client = GeminiLlmClient(
        api_key=settings.GOOGLE_API_KEY,
        model=settings.LLM_MODEL,
        lite_model=settings.LLM_LITE_MODEL,
        brief_temperature=settings.LLM_BRIEF_TEMPERATURE,
    )
    rss_client = RssFeedClient()
    trends_client = GoogleTrendsClient()
    producthunt_client = ProductHuntApiClient(api_token=settings.PRODUCTHUNT_API_TOKEN)

    subreddits = _parse_csv(settings.PIPELINE_SUBREDDITS)
    rss_feeds = _parse_csv(settings.PIPELINE_RSS_FEEDS)
    appstore_keywords = _parse_csv(settings.PIPELINE_APPSTORE_KEYWORDS)
    appstore_client = AppStoreClient() if appstore_keywords else None
    playstore_client = PlayStoreClient() if appstore_keywords else None

    return PipelineService(
        repo=repos["pipeline"],
        reddit=reddit_client,
        llm=llm_client,
        rss=rss_client,
        trends=trends_client,
        producthunt=producthunt_client,
        subreddits=subreddits,
        rss_feeds=rss_feeds,
        fetch_limit=settings.PIPELINE_FETCH_LIMIT,
        appstore=appstore_client,
        playstore=playstore_client,
        appstore_keywords=appstore_keywords,
        appstore_review_pages=settings.PIPELINE_APPSTORE_REVIEW_PAGES,
        playstore_review_count=settings.PIPELINE_PLAYSTORE_REVIEW_COUNT,
        appstore_max_age_days=settings.PIPELINE_APPSTORE_MAX_AGE_DAYS,
    )


def create_app() -> FastAPI:
    settings = get_settings()
    _init_sentry(settings)

    db = Database(settings.API_DATABASE_URL)
    repos = _create_repositories(db)
    services = _create_services(repos)
    services["pipeline_service"] = _create_pipeline_service(settings, repos)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[dict]:
        yield services
        await db.dispose()

    app = FastAPI(
        title="idea-fork API",
        version="0.1.0",
        docs_url="/docs" if settings.API_DEBUG else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.API_DEBUG else None,
        lifespan=lifespan,
    )

    app.state.limiter = limiter

    origins = _parse_csv(settings.API_CORS_ALLOWED_ORIGINS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    @app.exception_handler(RateLimitExceeded)
    async def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> Response:
        return JSONResponse(
            status_code=429,
            content={
                "type": "https://api.idea-fork.com/errors/rate-limit-exceeded",
                "title": "Too Many Requests",
                "status": 429,
                "detail": "Rate limit exceeded. Please try again later.",
            },
            headers={"Retry-After": "60"},
            media_type="application/problem+json",
        )

    @app.exception_handler(Exception)
    async def _unhandled_handler(request: Request, exc: Exception) -> Response:
        if settings.SENTRY_DSN:
            sentry_sdk.capture_exception(exc)
        return JSONResponse(
            status_code=500,
            content={
                "type": "https://api.idea-fork.com/errors/internal-server-error",
                "title": "Internal Server Error",
                "status": 500,
                "detail": "An unexpected error occurred.",
            },
            media_type="application/problem+json",
        )

    v1_router_prefix = "/v1"
    app.include_router(tag_router, prefix=v1_router_prefix)
    app.include_router(post_router, prefix=v1_router_prefix)
    app.include_router(brief_router, prefix=v1_router_prefix)
    app.include_router(product_router, prefix=v1_router_prefix)
    app.include_router(rating_router, prefix=v1_router_prefix)

    app.include_router(pipeline_router, prefix="/internal")

    if settings.API_DEBUG:
        from inbound.http.admin.router import router as admin_router

        app.include_router(admin_router)

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app
