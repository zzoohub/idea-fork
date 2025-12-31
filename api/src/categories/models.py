"""
Category SQLModel for the categories table.

Categories are predefined labels for classifying ideas.
"""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime
from sqlmodel import Column, Field, Relationship, SQLModel


def _utc_now() -> datetime:
    """Get current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)

if TYPE_CHECKING:
    from src.ideas.models import Idea


class IdeaCategory(SQLModel, table=True):
    """Junction table for many-to-many relationship between ideas and categories."""

    __tablename__ = "idea_categories"  # type: ignore[assignment]

    idea_id: int = Field(foreign_key="ideas.id", primary_key=True, ondelete="CASCADE")
    category_id: int = Field(
        foreign_key="categories.id", primary_key=True, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=_utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class Category(SQLModel, table=True):
    """Category model representing product idea categories."""

    __tablename__ = "categories"  # type: ignore[assignment]

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    slug: str = Field(index=True, unique=True)
    color_variant: str = Field(default="secondary")
    display_order: int = Field(default=0)
    created_at: datetime = Field(
        default_factory=_utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=_utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    # Relationships
    ideas: list["Idea"] = Relationship(
        back_populates="categories", link_model=IdeaCategory
    )
