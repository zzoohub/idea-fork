"""
Idea SQLModel for the ideas table.

Ideas are AI-generated product concepts with metadata and PRD content.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Column, Field, Relationship, SQLModel


class Idea(SQLModel, table=True):
    """Idea model representing AI-generated product ideas."""

    __tablename__ = "ideas"  # type: ignore[assignment]

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

    # Taxonomy fields (new 3-dimension classification)
    function_slug: str = Field(index=True)  # What the product does
    industry_slug: Optional[str] = Field(default=None, index=True)  # Target industry
    target_user_slug: Optional[str] = Field(
        default=None, index=True
    )  # Primary audience

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

    # Self-referential relationship for forks
    forked_from: Optional["Idea"] = Relationship(
        sa_relationship_kwargs={
            "remote_side": "Idea.id",
            "foreign_keys": "[Idea.forked_from_id]",
        }
    )
