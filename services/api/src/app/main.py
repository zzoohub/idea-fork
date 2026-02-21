from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from starlette.responses import JSONResponse, Response

from domain.brief.service import BriefService
from domain.post.service import PostService
from domain.product.service import ProductService
from domain.rating.service import RatingService
from domain.tag.service import TagService
from inbound.http.brief.router import router as brief_router
from inbound.http.errors import register_exception_handlers
from inbound.http.limiter import limiter
from inbound.http.post.router import router as post_router
from inbound.http.product.router import router as product_router
from inbound.http.rating.router import router as rating_router
from inbound.http.tag.router import router as tag_router
from outbound.postgres.brief_repository import PostgresBriefRepository
from outbound.postgres.database import Database
from outbound.postgres.post_repository import PostgresPostRepository
from outbound.postgres.product_repository import PostgresProductRepository
from outbound.postgres.rating_repository import PostgresRatingRepository
from outbound.postgres.tag_repository import PostgresTagRepository
from shared.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    db = Database(settings.API_DATABASE_URL)

    tag_repo = PostgresTagRepository(db)
    post_repo = PostgresPostRepository(db)
    brief_repo = PostgresBriefRepository(db)
    product_repo = PostgresProductRepository(db)
    rating_repo = PostgresRatingRepository(db)

    tag_service = TagService(tag_repo)
    post_service = PostService(post_repo)
    brief_service = BriefService(brief_repo)
    product_service = ProductService(product_repo)
    rating_service = RatingService(rating_repo, brief_repo)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[dict]:
        yield {
            "tag_service": tag_service,
            "post_service": post_service,
            "brief_service": brief_service,
            "product_service": product_service,
            "rating_service": rating_service,
        }
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

    origins = [o.strip() for o in settings.API_CORS_ALLOWED_ORIGINS.split(",")]
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

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app
