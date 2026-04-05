from pydantic import BaseModel, Field


class RatingBody(BaseModel):
    is_positive: bool
    feedback: str | None = Field(None, max_length=500)


# Aliases kept for backward compatibility with existing imports
RatingCreateBody = RatingBody
RatingUpdateBody = RatingBody
