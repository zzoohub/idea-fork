from dataclasses import dataclass, field
from datetime import datetime

VALID_POST_TYPES = {
    "need", "complaint", "feature_request", "alternative_seeking",
    "comparison", "question", "review",
    "showcase", "discussion", "other",
}
ACTIONABLE_POST_TYPES = {
    "need", "complaint", "feature_request", "alternative_seeking",
    "comparison", "question", "review",
}


@dataclass(frozen=True)
class PostTag:
    slug: str
    name: str


@dataclass(frozen=True)
class Post:
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
    post_type: str | None = None
    tags: list[PostTag] = field(default_factory=list)


@dataclass
class PostListParams:
    cursor: str | None = None
    limit: int = 20
    sort: str = "-external_created_at"
    tag: str | None = None
    source: str | None = None
    subreddit: str | None = None
    sentiment: str | None = None
    q: str | None = None
    product: str | None = None
    post_type: str | None = None
