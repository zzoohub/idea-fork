from datetime import datetime

from pydantic import BaseModel

from domain.post.models import Post


class PostTagResponseData(BaseModel):
    slug: str
    name: str


class PostResponseData(BaseModel):
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
    tags: list[PostTagResponseData]

    @classmethod
    def from_domain(cls, post: Post) -> "PostResponseData":
        return cls(
            id=post.id,
            title=post.title,
            body=post.body,
            source=post.source,
            subreddit=post.subreddit,
            external_url=post.external_url,
            external_created_at=post.external_created_at,
            score=post.score,
            num_comments=post.num_comments,
            sentiment=post.sentiment,
            post_type=post.post_type,
            tags=[PostTagResponseData(slug=t.slug, name=t.name) for t in post.tags],
        )
