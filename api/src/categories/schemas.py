"""
Category Pydantic schemas for API responses.

Matches the frontend CategoryBadge TypeScript interface.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class CategoryBadgeResponse(BaseModel):
    """Category badge response matching frontend CategoryBadge type."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    label: str
    variant: Literal["primary", "teal", "orange", "indigo", "secondary"]

    @classmethod
    def from_category(cls, name: str, color_variant: str) -> "CategoryBadgeResponse":
        """Create CategoryBadgeResponse from category data."""
        return cls(label=name, variant=color_variant)


class CategoryResponse(BaseModel):
    """Full category response for category listing endpoints."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: int
    name: str
    slug: str
    colorVariant: Literal["primary", "teal", "orange", "indigo", "secondary"]
    displayOrder: int
    createdAt: datetime
    updatedAt: datetime

    @classmethod
    def from_db_row(cls, row: dict) -> "CategoryResponse":
        """Create CategoryResponse from database row."""
        return cls(
            id=row["id"],
            name=row["name"],
            slug=row["slug"],
            colorVariant=row["color_variant"],
            displayOrder=row["display_order"],
            createdAt=row["created_at"],
            updatedAt=row["updated_at"],
        )
