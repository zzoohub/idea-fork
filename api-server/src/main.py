"""
FastAPI application entry point for Idea Fork API.

This module initializes the FastAPI application with:
- CORS middleware for frontend access
- API routers for ideas, categories, and health endpoints
- OpenAPI documentation
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.categories.router import router as categories_router
from src.core.config import settings
from src.health.router import router as health_router
from src.ideas.router import router as ideas_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    print(f"Starting {settings.app_name}...")
    yield
    print(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    description="""
    Idea Fork API - AI-powered product idea generation platform.

    ## Features

    - **Ideas**: Browse, search, and filter AI-generated product ideas
    - **Categories**: Access predefined categories for idea classification
    - **Health**: Monitor API health status

    ## Pagination

    The ideas listing endpoint uses cursor-based pagination for consistent
    results when browsing large datasets. Use the `nextCursor` value from
    the response to fetch subsequent pages.

    ## Filtering & Sorting

    Ideas can be filtered by category and searched using full-text search.
    Multiple sort options are available: newest, oldest, popular, alphabetical.
    """,
    version="0.1.0",
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
app.include_router(categories_router, prefix=settings.api_prefix)


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
