from enum import Enum

from fastapi import Query

from domain.post.models import PostListParams


class PostSortField(str, Enum):
    EXTERNAL_CREATED_AT_DESC = "-external_created_at"
    SCORE_DESC = "-score"
    NUM_COMMENTS_DESC = "-num_comments"


class PostTypeFilter(str, Enum):
    NEED = "need"
    COMPLAINT = "complaint"
    FEATURE_REQUEST = "feature_request"
    ALTERNATIVE_SEEKING = "alternative_seeking"
    COMPARISON = "comparison"
    QUESTION = "question"
    REVIEW = "review"
    SHOWCASE = "showcase"
    DISCUSSION = "discussion"
    OTHER = "other"


def get_post_list_params(
    cursor: str | None = Query(None, max_length=2048),
    limit: int = Query(20, ge=1, le=100),
    sort: PostSortField = Query(PostSortField.EXTERNAL_CREATED_AT_DESC),
    tag: str | None = Query(None, max_length=500),
    source: str | None = Query(None, max_length=100),
    subreddit: str | None = Query(None, max_length=100),
    sentiment: str | None = Query(None, max_length=100),
    q: str | None = Query(None, max_length=200),
    product: str | None = Query(None, max_length=200),
    post_type: PostTypeFilter | None = Query(None),
) -> PostListParams:
    return PostListParams(
        cursor=cursor,
        limit=limit,
        sort=sort.value,
        tag=tag,
        source=source,
        subreddit=subreddit,
        sentiment=sentiment,
        q=q,
        product=product,
        post_type=post_type.value if post_type else None,
    )
