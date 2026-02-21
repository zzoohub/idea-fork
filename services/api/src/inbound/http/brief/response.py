from datetime import datetime
from typing import Any

from pydantic import BaseModel

from domain.brief.models import Brief


class BriefListResponseData(BaseModel):
    id: int
    slug: str
    title: str
    summary: str
    status: str
    published_at: datetime | None
    source_count: int
    upvote_count: int
    downvote_count: int
    demand_signals: dict[str, Any]

    @classmethod
    def from_domain(cls, brief: Brief) -> "BriefListResponseData":
        return cls(
            id=brief.id,
            slug=brief.slug,
            title=brief.title,
            summary=brief.summary,
            status=brief.status,
            published_at=brief.published_at,
            source_count=brief.source_count,
            upvote_count=brief.upvote_count,
            downvote_count=brief.downvote_count,
            demand_signals=brief.demand_signals,
        )


class BriefDetailResponseData(BriefListResponseData):
    problem_statement: str
    opportunity: str
    solution_directions: list[str]
    source_snapshots: list[dict[str, Any]]

    @classmethod
    def from_domain(cls, brief: Brief) -> "BriefDetailResponseData":
        return cls(
            id=brief.id,
            slug=brief.slug,
            title=brief.title,
            summary=brief.summary,
            status=brief.status,
            published_at=brief.published_at,
            source_count=brief.source_count,
            upvote_count=brief.upvote_count,
            downvote_count=brief.downvote_count,
            demand_signals=brief.demand_signals,
            problem_statement=brief.problem_statement,
            opportunity=brief.opportunity,
            solution_directions=brief.solution_directions,
            source_snapshots=brief.source_snapshots,
        )
