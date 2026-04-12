from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, TypedDict


class DemandSignals(TypedDict, total=False):
    post_count: int
    subreddit_count: int
    avg_score: float
    total_comments: int
    trend_data: dict[str, Any]
    competitive_landscape: str


class SourceSnapshot(TypedDict, total=False):
    post_id: int
    title: str
    snippet: str
    external_url: str
    subreddit: str
    score: int
    source: str
    body: str


@dataclass(frozen=True)
class Brief:
    id: int
    slug: str
    title: str
    summary: str
    problem_statement: str
    opportunity: str
    status: str
    published_at: datetime | None
    source_count: int
    upvote_count: int
    downvote_count: int
    demand_signals: DemandSignals = field(default_factory=dict)
    solution_directions: list[str] = field(default_factory=list)
    source_snapshots: list[SourceSnapshot] = field(default_factory=list)


@dataclass
class BriefListParams:
    cursor: str | None = None
    limit: int = 20
    sort: str = "-published_at"
