from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Rating:
    id: int
    brief_id: int
    is_positive: bool
    feedback: str | None
    created_at: datetime


@dataclass(frozen=True)
class CreateRatingRequest:
    brief_id: int
    session_id: str
    is_positive: bool
    feedback: str | None = None


@dataclass(frozen=True)
class UpdateRatingRequest:
    brief_id: int
    session_id: str
    is_positive: bool
    feedback: str | None = None
