from typing import Protocol

from domain.pipeline.models import (
    BriefDraft,
    ClusteringResult,
    RawRedditPost,
    TaggingResult,
)
from domain.post.models import Post


class RedditClient(Protocol):
    async def fetch_posts(
        self,
        subreddits: list[str],
        limit: int,
        time_filter: str = "week",
    ) -> list[RawRedditPost]: ...


class LlmClient(Protocol):
    async def tag_posts(self, posts: list[Post]) -> list[TaggingResult]: ...

    async def cluster_posts(self, posts: list[Post]) -> list[ClusteringResult]: ...

    async def synthesize_brief(
        self, label: str, summary: str, posts: list[Post]
    ) -> BriefDraft: ...


class PipelineRepository(Protocol):
    async def acquire_advisory_lock(self) -> bool: ...

    async def release_advisory_lock(self) -> None: ...

    async def upsert_posts(self, posts: list[RawRedditPost]) -> int: ...

    async def get_pending_posts(self, limit: int = 100) -> list[Post]: ...

    async def get_tagged_posts_without_cluster(self) -> list[Post]: ...

    async def save_tagging_results(self, results: list[TaggingResult]) -> None: ...

    async def mark_tagging_failed(self, post_ids: list[int]) -> None: ...

    async def save_clusters(self, clusters: list[ClusteringResult]) -> None: ...

    async def get_clusters_without_briefs(
        self,
    ) -> list[tuple[int, str, str, list[Post]]]: ...

    async def save_brief(self, cluster_id: int, draft: BriefDraft) -> None: ...
