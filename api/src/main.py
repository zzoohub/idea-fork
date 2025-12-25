"""
FastAPI application entry point for Idea Fork API.

This module initializes the FastAPI application with:
- CORS middleware for frontend access
- API routers for ideas, categories, generation, and health endpoints
- OpenAPI documentation
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.generation.router import router as generation_router
from src.health.router import router as health_router
from src.ideas.router import router as ideas_router
from src.taxonomies.router import router as taxonomies_router

logger = logging.getLogger(__name__)


def _configure_idea_generator() -> None:
    """Configure idea-generator package with API settings (one-time init)."""
    try:
        from idea_generator.pipeline.config import PipelineSettings, configure_settings

        pipeline_settings = PipelineSettings(
            google_api_key=settings.google_api_key,
            llm_model=settings.llm_model,
            llm_temperature=settings.llm_temperature,
            llm_max_tokens=settings.llm_max_tokens,
            database_url=settings.database_url.replace("+asyncpg", ""),
        )
        configure_settings(pipeline_settings)
        logger.info("idea-generator configured successfully")
    except ImportError:
        logger.warning("idea-generator not installed, SSE streaming will not work")
    except Exception as e:
        logger.error(f"Failed to configure idea-generator: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    logger.info(f"Starting {settings.app_name}...")

    # Initialize idea-generator (one-time)
    _configure_idea_generator()

    yield

    logger.info(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    description="""
    Idea Fork API - AI-powered product idea generation platform.

    ## Features

    - **Ideas**: Browse, search, and filter AI-generated product ideas
    - **Generation**: Request on-demand idea generation or fork existing ideas
    - **Categories**: Access predefined categories for idea classification
    - **Health**: Monitor API health status

    ## On-Demand Generation

    Use the generation endpoints to request new ideas or fork existing ones:
    - POST /api/ideas/generate - Generate a new idea
    - POST /api/ideas/{slug}/fork - Fork an existing idea with modifications
    - GET /api/requests/{id} - Check generation status
    - GET /api/requests/{id}/stream - Real-time progress via SSE

    ## Pagination

    The ideas listing endpoint uses cursor-based pagination for consistent
    results when browsing large datasets. Use the `nextCursor` value from
    the response to fetch subsequent pages.

    ## Filtering & Sorting

    Ideas can be filtered by category and searched using full-text search.
    Multiple sort options are available: newest, oldest, popular, alphabetical.
    """,
    version="0.2.0",
    docs_url="/docs" if settings.debug else "/docs",
    redoc_url="/redoc" if settings.debug else "/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(ideas_router, prefix=settings.api_prefix)
app.include_router(generation_router, prefix=settings.api_prefix)
app.include_router(taxonomies_router, prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint redirecting to documentation."""
    return {
        "message": f"Welcome to {settings.app_name}",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": f"{settings.api_prefix}/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
