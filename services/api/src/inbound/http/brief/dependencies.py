from enum import Enum

from fastapi import Query

from domain.brief.models import BriefListParams


class BriefSortField(str, Enum):
    PUBLISHED_AT_DESC = "-published_at"
    UPVOTE_COUNT_DESC = "-upvote_count"
    SOURCE_COUNT_DESC = "-source_count"


def get_brief_list_params(
    cursor: str | None = Query(None, max_length=2048),
    limit: int = Query(20, ge=1, le=100),
    sort: BriefSortField = Query(BriefSortField.PUBLISHED_AT_DESC),
) -> BriefListParams:
    return BriefListParams(cursor=cursor, limit=limit, sort=sort.value)
