"""
Category Pydantic schemas for API responses.

Matches the frontend CategoryBadge TypeScript interface.
"""

from datetime import datetime
from typing import Any, Literal, Mapping

from pydantic import BaseModel, ConfigDict

ColorVariant = Literal["primary", "teal", "orange", "indigo", "secondary"]


class CategoryBadgeResponse(BaseModel):
    """Category badge response matching frontend CategoryBadge type."""

    model_config = ConfigDict(from_attributes=True)

    label: str
    variant: ColorVariant

    @classmethod
    def from_category(
        cls, name: str, color_variant: ColorVariant
    ) -> "CategoryBadgeResponse":
        """Create CategoryBadgeResponse from category data."""
        return cls(label=name, variant=color_variant)


class CategoryResponse(BaseModel):
    """Full category response for category listing endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    color_variant: ColorVariant
    display_order: int
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_db_row(cls, row: Mapping[str, Any]) -> "CategoryResponse":
        """Create CategoryResponse from database row."""
        return cls(
            id=row["id"],
            name=row["name"],
            slug=row["slug"],
            color_variant=row["color_variant"],
            display_order=row["display_order"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
