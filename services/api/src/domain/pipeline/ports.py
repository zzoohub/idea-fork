from typing import Protocol

from typing import Any

from domain.pipeline.models import (
    BriefDraft,
    ClusteringResult,
    RawPost,
    RawProduct,
    TaggingResult,
)
from domain.post.models import Post


class RedditClient(Protocol):
    async def fetch_posts(
        self,
        subreddits: list[str],
        limit: int,
        time_filter: str = "week",
    ) -> list[RawPost]: ...


class RssClient(Protocol):
    async def fetch_posts(self, feed_urls: list[str]) -> list[RawPost]: ...


class TrendsClient(Protocol):
    async def get_interest(self, keywords: list[str]) -> dict[str, Any]: ...


class ProductHuntClient(Protocol):
    async def fetch_recent_products(self, limit: int = 30) -> list[RawProduct]: ...


class AppStoreClient(Protocol):
    async def search_apps(
        self, keywords: list[str], limit: int = 20
    ) -> list[RawProduct]: ...

    async def fetch_reviews(
        self, app_id: str, country: str = "us", pages: int = 3
    ) -> list[RawPost]: ...


class PlayStoreClient(Protocol):
    async def search_apps(
        self, keywords: list[str], limit: int = 20
    ) -> list[RawProduct]: ...

    async def fetch_reviews(
        self, app_id: str, count: int = 100
    ) -> list[RawPost]: ...


class LlmClient(Protocol):
    async def tag_posts(
        self, posts: list[Post], *, existing_tags: list[str] | None = None,
    ) -> list[TaggingResult]: ...

    async def cluster_posts(self, posts: list[Post]) -> list[ClusteringResult]: ...

    async def synthesize_brief(
        self,
        label: str,
        summary: str,
        posts: list[Post],
        *,
        trends_data: dict[str, Any] | None = None,
        related_products: list[RawProduct] | None = None,
    ) -> BriefDraft: ...


class PipelineRepository(Protocol):
    async def acquire_advisory_lock(self) -> bool: ...

    async def release_advisory_lock(self) -> None: ...

    async def upsert_posts(self, posts: list[RawPost]) -> int: ...

    async def upsert_products(self, products: list[RawProduct]) -> int: ...

    async def get_pending_posts(self, limit: int = 1000) -> list[Post]: ...

    async def get_tagged_posts_without_cluster(self) -> list[Post]: ...

    async def save_tagging_results(self, results: list[TaggingResult]) -> None: ...

    async def mark_tagging_failed(self, post_ids: list[int]) -> None: ...

    async def save_clusters(self, clusters: list[ClusteringResult]) -> None: ...

    async def get_clusters_without_briefs(
        self,
    ) -> list[tuple[int, str, str, list[Post]]]: ...

    async def get_existing_tag_slugs(self) -> list[str]: ...

    async def save_brief(self, cluster_id: int, draft: BriefDraft) -> None: ...

    async def find_related_products(self, keyword: str) -> list[RawProduct]: ...

    async def update_product_scores(self) -> int: ...
