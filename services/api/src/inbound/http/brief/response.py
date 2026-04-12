from datetime import datetime

from domain.brief.models import DemandSignals, SourceSnapshot
from inbound.http.response import ResponseData


class BriefListResponseData(ResponseData):
    id: int
    slug: str
    title: str
    summary: str
    status: str
    published_at: datetime | None
    source_count: int
    upvote_count: int
    downvote_count: int
    demand_signals: DemandSignals


class BriefDetailResponseData(BriefListResponseData):
    problem_statement: str
    opportunity: str
    solution_directions: list[str]
    source_snapshots: list[SourceSnapshot]
