"""
Pydantic schemas for generation API endpoints.

Request/response models for idea generation and forking.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class RequestStatus(str, Enum):
    """Status of a generation request."""

    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerationProgressStatus(str, Enum):
    """Detailed progress status for SSE updates."""

    QUEUED = "queued"
    GENERATING_CONCEPT = "generating_concept"
    EXPANDING_PRD = "expanding_prd"
    CATEGORIZING = "categorizing"
    SAVING = "saving"
    COMPLETED = "completed"
    FAILED = "failed"


# Request schemas
class GenerateIdeaRequest(BaseModel):
    """Request to generate a new idea."""

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    # Optional user context (will be set from auth in future)
    # For now, accepts anonymous requests


class ForkIdeaRequest(BaseModel):
    """Request to fork an existing idea with modifications."""

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    # Optional modifications to apply when forking
    focus: Optional[str] = Field(
        None,
        max_length=500,
        description="New focus or direction for the forked idea",
    )
    target_audience: Optional[str] = Field(
        None,
        max_length=500,
        alias="targetAudience",
        description="New target audience to adapt the idea for",
    )
    industry: Optional[str] = Field(
        None,
        max_length=200,
        description="Apply the idea to a different industry",
    )
    additional_notes: Optional[str] = Field(
        None,
        max_length=1000,
        alias="additionalNotes",
        description="Additional context or requirements for the fork",
    )


# Response schemas
class GenerationRequestResponse(BaseModel):
    """Response after initiating a generation request."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    request_id: UUID = Field(alias="requestId")
    status: RequestStatus
    message: str = "Request queued successfully"


class GenerationStatusResponse(BaseModel):
    """Response for generation request status check."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    request_id: UUID = Field(alias="requestId")
    status: RequestStatus
    progress: Optional[GenerationProgressStatus] = None
    progress_message: Optional[str] = Field(None, alias="progressMessage")
    progress_percent: Optional[int] = Field(None, alias="progressPercent")

    # Result fields (populated on completion)
    idea_id: Optional[int] = Field(None, alias="ideaId")
    idea_slug: Optional[str] = Field(None, alias="ideaSlug")

    # Error field (populated on failure)
    error: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(alias="createdAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")


class SSEProgressEvent(BaseModel):
    """Server-Sent Event for real-time progress updates."""

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    event: str  # "progress", "completed", "failed"
    status: GenerationProgressStatus
    message: str
    progress_percent: int = Field(alias="progressPercent")

    # Result fields (for completed event)
    idea_id: Optional[int] = Field(None, alias="ideaId")
    idea_slug: Optional[str] = Field(None, alias="ideaSlug")

    # Error field (for failed event)
    error: Optional[str] = None
