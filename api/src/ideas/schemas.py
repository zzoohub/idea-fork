"""
Idea Pydantic schemas for API responses.

Matches the frontend Idea TypeScript interface with camelCase keys.
"""

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from src.categories.schemas import CategoryBadgeResponse


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class SortBy(str, Enum):
    """Sort options for idea listing."""

    NEWEST = "newest"
    OLDEST = "oldest"
    POPULAR = "popular"
    ALPHABETICAL = "alphabetical"


class TaxonomyResponse(BaseModel):
    """Taxonomy classification for an idea."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    functionSlug: str
    industrySlug: Optional[str] = None
    targetUserSlug: Optional[str] = None


class IdeaResponse(BaseModel):
    """Idea response matching frontend Idea type."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: str
    title: str
    slug: str
    imageUrl: str
    imageAlt: str
    categories: list[CategoryBadgeResponse]  # Legacy, kept for compatibility
    taxonomy: TaxonomyResponse  # New taxonomy classification
    problem: str
    solution: str
    targetUsers: str
    createdAt: str
    popularity: Optional[int] = None


class IdeaDetailResponse(IdeaResponse):
    """Extended idea response with full details for single idea view."""

    keyFeatures: list[str] = Field(default=[])
    prdContent: Optional[dict[str, Any]] = None
    viewCount: int = 0
    publishedAt: Optional[str] = None
    updatedAt: str


class IdeaListResponse(BaseModel):
    """Response wrapper for list of ideas with pagination metadata."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    items: list[IdeaResponse]
    nextCursor: Optional[str] = None
    hasMore: bool = False
