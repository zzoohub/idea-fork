from datetime import datetime

from inbound.http.response import ResponseData


class RatingResponseData(ResponseData):
    id: int
    brief_id: int
    is_positive: bool
    feedback: str | None
    created_at: datetime
