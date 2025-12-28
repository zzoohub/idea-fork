"""
Pydantic schemas for generation API endpoints.

Request/response models for idea generation and forking.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.generation.models import RequestStatus


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
    """Request to generate a new idea.

    Supports multiple generation modes:
    1. Auto-generate: No inputs → random function + random industry
    2. Taxonomy selection: User selects function/industry via dropdowns
    3. Seed-based: User provides idea_seed text, AI structures and expands it
    """

    # Taxonomy selection (optional - random if not provided)
    function_slug: Optional[str] = Field(
        default=None,
        description="Function type slug (e.g., 'create', 'automate'). Random if not provided.",
    )
    industry_slug: Optional[str] = Field(
        default=None,
        description="Industry slug (e.g., 'healthcare', 'finance'). Random if not provided.",
    )

    # User idea seed (optional)
    idea_seed: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Free-form text describing user's idea. AI will structure and expand it.",
    )


class ForkIdeaRequest(BaseModel):
    """Request to fork an existing idea with modifications."""

    # Optional modifications to apply when forking
    focus: Optional[str] = Field(
        default=None,
        max_length=500,
        description="New focus or direction for the forked idea",
    )
    target_audience: Optional[str] = Field(
        default=None,
        max_length=500,
        description="New target audience to adapt the idea for",
    )
    industry: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Apply the idea to a different industry",
    )
    additional_notes: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Additional context or requirements for the fork",
    )


# Response schemas
class GenerationRequestResponse(BaseModel):
    """Response after initiating a generation request."""

    model_config = ConfigDict(from_attributes=True)

    request_id: UUID
    status: RequestStatus
    message: str = "Request queued successfully"


class GenerationStatusResponse(BaseModel):
    """Response for generation request status check."""

    model_config = ConfigDict(from_attributes=True)

    request_id: UUID
    status: RequestStatus
    progress: Optional[GenerationProgressStatus] = None
    progress_message: Optional[str] = None
    progress_percent: Optional[int] = None

    # Result fields (populated on completion)
    idea_id: Optional[int] = None
    idea_slug: Optional[str] = None

    # Error field (populated on failure)
    error: Optional[str] = None

    # Timestamps
    created_at: datetime
    completed_at: Optional[datetime] = None


class SSEProgressEvent(BaseModel):
    """Server-Sent Event for real-time progress updates."""

    event: str  # "progress", "completed", "failed"
    status: GenerationProgressStatus
    message: str
    progress_percent: int

    # Result fields (for completed event)
    idea_id: Optional[int] = None
    idea_slug: Optional[str] = None

    # Error field (for failed event)
    error: Optional[str] = None
