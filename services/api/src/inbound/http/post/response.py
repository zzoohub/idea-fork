from datetime import datetime

from inbound.http.response import ResponseData, TagData


class PostResponseData(ResponseData):
    id: int
    title: str
    body: str | None
    source: str
    subreddit: str | None
    external_url: str
    external_created_at: datetime
    score: int
    num_comments: int
    sentiment: str | None
    post_type: str | None
    tags: list[TagData]
