from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class RawRedditPost:
    external_id: str
    subreddit: str
    title: str
    body: str | None
    external_url: str
    external_created_at: datetime
    score: int
    num_comments: int


@dataclass(frozen=True)
class TaggingResult:
    post_id: int
    post_type: str
    sentiment: str
    tag_slugs: list[str]


@dataclass(frozen=True)
class ClusteringResult:
    label: str
    summary: str
    post_ids: list[int]


@dataclass(frozen=True)
class BriefDraft:
    title: str
    slug: str
    summary: str
    problem_statement: str
    opportunity: str
    solution_directions: list[str]
    demand_signals: dict[str, Any]
    source_snapshots: list[dict[str, Any]]
    source_post_ids: list[int]


@dataclass
class PipelineRunResult:
    posts_fetched: int = 0
    posts_upserted: int = 0
    posts_tagged: int = 0
    clusters_created: int = 0
    briefs_generated: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0
