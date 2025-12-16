"""
Ideas API router.

Provides endpoints for listing and retrieving product ideas.
"""

from typing import Optional

from fastapi import APIRouter, Query

from src.core.config import settings
from src.core.database import DbSession
from src.core.exceptions import NotFoundError
from src.ideas.schemas import IdeaDetailResponse, IdeaListResponse, SortBy
from src.ideas.service import IdeaService

router = APIRouter(prefix="/ideas", tags=["Ideas"])


@router.get(
    "",
    response_model=IdeaListResponse,
    summary="List ideas",
    description="Get a paginated list of published ideas with optional filtering and sorting.",
)
async def list_ideas(
    session: DbSession,
    search: Optional[str] = Query(
        None,
        description="Search query for full-text search across title, problem, solution",
        min_length=1,
        max_length=200,
    ),
    category: Optional[str] = Query(
        None,
        description="Category slug to filter by (e.g., 'ai', 'saas', 'ecommerce')",
    ),
    sort_by: SortBy = Query(
        SortBy.NEWEST,
        alias="sortBy",
        description="Sort order: newest, oldest, popular, or alphabetical",
    ),
    limit: int = Query(
        settings.default_page_size,
        ge=1,
        le=settings.max_page_size,
        description="Number of items to return",
    ),
    cursor: Optional[str] = Query(
        None,
        description="Pagination cursor from previous response",
    ),
) -> IdeaListResponse:
    """List published ideas with filtering, sorting, and cursor-based pagination."""
    service = IdeaService(session)
    return await service.list_ideas(
        search=search,
        category=category,
        sort_by=sort_by,
        limit=limit,
        cursor=cursor,
    )


@router.get(
    "/{slug}",
    response_model=IdeaDetailResponse,
    summary="Get idea by slug",
    description="Get a single published idea by its URL-friendly slug.",
    responses={
        404: {
            "description": "Idea not found",
            "content": {"application/json": {"example": {"detail": "Idea not found"}}},
        }
    },
)
async def get_idea(session: DbSession, slug: str) -> IdeaDetailResponse:
    """Get a single idea by its slug."""
    service = IdeaService(session)
    idea = await service.get_idea_by_slug(slug)

    if not idea:
        raise NotFoundError("Idea")

    return idea
