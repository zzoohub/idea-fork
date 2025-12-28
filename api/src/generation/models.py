"""
Generation request SQLModel for tracking idea generation jobs.

Tracks the status and results of RQ-based idea generation tasks.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Column, Field, SQLModel


class RequestStatus(str, Enum):
    """Status of a generation request."""

    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerationRequest(SQLModel, table=True):
    """Tracks idea generation requests and their status."""

    __tablename__ = "generation_requests"  # type: ignore

    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True),
    )

    # User who requested generation (optional for anonymous/scheduled)
    user_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), index=True),
    )

    # Request status
    status: RequestStatus = Field(default=RequestStatus.QUEUED)

    # RQ job tracking
    rq_job_id: str = Field(index=True)

    # Result references (populated on completion)
    idea_id: Optional[int] = Field(default=None, foreign_key="ideas.id", index=True)

    # Fork reference (if this was a fork request)
    forked_from_id: Optional[int] = Field(
        default=None,
        foreign_key="ideas.id",
    )

    # Error tracking
    error_message: Optional[str] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)

    def is_terminal(self) -> bool:
        """Check if request is in a terminal state."""
        return self.status in (RequestStatus.COMPLETED, RequestStatus.FAILED)
