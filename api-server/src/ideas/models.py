"""
Idea SQLModel for the ideas table.

Ideas are AI-generated product concepts with metadata and PRD content.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional
from uuid import UUID

from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlmodel import Column, Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.categories.models import Category
    from src.users.models import User

from src.categories.models import IdeaCategory


class Idea(SQLModel, table=True):
    """Idea model representing AI-generated product ideas."""

    __tablename__ = "ideas"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    slug: str = Field(unique=True, index=True)

    # Image fields
    image_url: str
    image_alt: str = Field(default="")

    # Core content
    problem: str
    solution: str
    target_users: str

    # JSON fields
    key_features: list[str] = Field(default=[], sa_column=Column(JSONB))
    prd_content: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))

    # Metrics
    popularity_score: int = Field(default=0, ge=0, le=100)
    view_count: int = Field(default=0, ge=0)

    # Publication status
    is_published: bool = Field(default=False)
    published_at: Optional[datetime] = Field(default=None)

    # Fork and creator references
    forked_from_id: Optional[int] = Field(
        default=None,
        foreign_key="ideas.id",
        index=True,
    )
    created_by_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), index=True),
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    categories: list["Category"] = Relationship(
        back_populates="ideas", link_model=IdeaCategory
    )
    forked_from: Optional["Idea"] = Relationship(
        sa_relationship_kwargs={
            "remote_side": "Idea.id",
            "foreign_keys": "[Idea.forked_from_id]",
        }
    )
