"""
Idea Pydantic schemas for API responses.

Matches the frontend Idea TypeScript interface.
"""

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from src.categories.schemas import CategoryBadgeResponse


class SortBy(str, Enum):
    """Sort options for idea listing."""

    NEWEST = "newest"
    OLDEST = "oldest"
    POPULAR = "popular"
    ALPHABETICAL = "alphabetical"


class TaxonomyResponse(BaseModel):
    """Taxonomy classification for an idea."""

    model_config = ConfigDict(from_attributes=True)

    function_slug: str
    industry_slug: Optional[str] = None
    target_user_slug: Optional[str] = None


class IdeaResponse(BaseModel):
    """Idea response matching frontend Idea type."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    slug: str
    image_url: str
    image_alt: str
    categories: list[CategoryBadgeResponse]  # Legacy, kept for compatibility
    taxonomy: TaxonomyResponse  # New taxonomy classification
    problem: str
    solution: str
    target_users: str
    created_at: str
    popularity: Optional[int] = None


class IdeaDetailResponse(IdeaResponse):
    """Extended idea response with full details for single idea view."""

    key_features: list[str] = Field(default=[])
    prd_content: Optional[dict[str, Any]] = None
    view_count: int = 0
    published_at: Optional[str] = None
    updated_at: str


class IdeaListResponse(BaseModel):
    """Response wrapper for list of ideas with pagination metadata."""

    model_config = ConfigDict(from_attributes=True)

    items: list[IdeaResponse]
    next_cursor: Optional[str] = None
    has_more: bool = False
