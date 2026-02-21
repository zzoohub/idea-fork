from pydantic import BaseModel, Field


class RatingCreateBody(BaseModel):
    is_positive: bool
    feedback: str | None = Field(None, max_length=500)


class RatingUpdateBody(BaseModel):
    is_positive: bool
    feedback: str | None = Field(None, max_length=500)
