from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


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
    demand_signals: dict[str, Any] = field(default_factory=dict)
    solution_directions: list[str] = field(default_factory=list)
    source_snapshots: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class BriefListParams:
    cursor: str | None = None
    limit: int = 20
    sort: str = "-published_at"
