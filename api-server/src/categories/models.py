"""
Category SQLModel for the categories table.

Categories are predefined labels for classifying ideas.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.ideas.models import Idea


class IdeaCategory(SQLModel, table=True):
    """Junction table for many-to-many relationship between ideas and categories."""

    __tablename__ = "idea_categories"

    idea_id: int = Field(foreign_key="ideas.id", primary_key=True, ondelete="CASCADE")
    category_id: int = Field(
        foreign_key="categories.id", primary_key=True, ondelete="CASCADE"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Category(SQLModel, table=True):
    """Category model representing product idea categories."""

    __tablename__ = "categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    slug: str = Field(index=True, unique=True)
    color_variant: str = Field(default="secondary")
    display_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    ideas: list["Idea"] = Relationship(
        back_populates="categories", link_model=IdeaCategory
    )
