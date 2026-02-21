from datetime import datetime

from pydantic import BaseModel

from domain.rating.models import Rating


class RatingResponseData(BaseModel):
    id: int
    brief_id: int
    is_positive: bool
    feedback: str | None
    created_at: datetime

    @classmethod
    def from_domain(cls, rating: Rating) -> "RatingResponseData":
        return cls(
            id=rating.id,
            brief_id=rating.brief_id,
            is_positive=rating.is_positive,
            feedback=rating.feedback,
            created_at=rating.created_at,
        )
