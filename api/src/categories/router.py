"""
Categories API router.

Provides endpoints for listing and retrieving categories.
"""

from fastapi import APIRouter

from src.categories.schemas import CategoryResponse
from src.categories.service import CategoryService
from src.core.database import DbSession
from src.core.exceptions import NotFoundError

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get(
    "",
    response_model=list[CategoryResponse],
    summary="List categories",
    description="Get all available categories for filtering ideas.",
)
async def list_categories(session: DbSession) -> list[CategoryResponse]:
    """List all categories ordered by display order."""
    service = CategoryService(session)
    return await service.list_categories()


@router.get(
    "/{slug}",
    response_model=CategoryResponse,
    summary="Get category by slug",
    description="Get a single category by its URL-friendly slug.",
    responses={
        404: {
            "description": "Category not found",
            "content": {"application/json": {"example": {"detail": "Category not found"}}},
        }
    },
)
async def get_category(session: DbSession, slug: str) -> CategoryResponse:
    """Get a single category by its slug."""
    service = CategoryService(session)
    category = await service.get_category_by_slug(slug)

    if not category:
        raise NotFoundError("Category")

    return category
