import asyncio
import logging

from domain.pipeline.models import PipelineRunResult
from domain.pipeline.ports import (
    LlmClient,
    PipelineRepository,
    ProductHuntClient,
    RedditClient,
    RssClient,
    TrendsClient,
)

logger = logging.getLogger(__name__)

TAGGING_BATCH_SIZE = 20
CLUSTERING_BATCH_SIZE = 200
_TRENDS_STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on",
    "at", "to", "for", "of", "with", "by", "from", "is",
    "are", "was", "were", "be", "been", "being", "have",
    "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can",
    "that", "this", "these", "those", "it", "its",
    "not", "no", "nor", "so", "if", "then", "than",
    "too", "very", "just", "about", "above", "after",
    "before", "between", "into", "through", "during",
    "each", "some", "such", "only", "other", "new",
    "now", "way", "don't", "posts", "post",
    "miscellaneous", "fit", "clusters", "cluster",
}


class PipelineService:
    def __init__(
        self,
        repo: PipelineRepository,
        reddit: RedditClient,
        llm: LlmClient,
        rss: RssClient,
        trends: TrendsClient,
        producthunt: ProductHuntClient,
        subreddits: list[str],
        rss_feeds: list[str] | None = None,
        fetch_limit: int = 100,
    ) -> None:
        self._repo = repo
        self._reddit = reddit
        self._llm = llm
        self._rss = rss
        self._trends = trends
        self._producthunt = producthunt
        self._subreddits = subreddits
        self._rss_feeds = rss_feeds or []
        self._fetch_limit = fetch_limit

    async def run(self) -> PipelineRunResult:
        result = PipelineRunResult()

        locked = await self._repo.acquire_advisory_lock()
        if not locked:
            logger.warning(
                "Pipeline already running (advisory lock held), skipping"
            )
            result.errors.append("Could not acquire advisory lock")
            return result

        try:
            await self._stage_fetch(result)
            await self._stage_tag(result)
            await self._stage_cluster(result)
            await self._stage_brief(result)
        finally:
            await self._repo.release_advisory_lock()

        return result

    async def _stage_fetch(self, result: PipelineRunResult) -> None:
        try:
            # Reddit
            raw_posts = await self._reddit.fetch_posts(
                subreddits=self._subreddits,
                limit=self._fetch_limit,
            )
            logger.info("Fetched %d posts from Reddit", len(raw_posts))

            # RSS
            if self._rss_feeds:
                rss_posts = await self._rss.fetch_posts(self._rss_feeds)
                logger.info("Fetched %d posts from RSS", len(rss_posts))
                raw_posts = raw_posts + rss_posts

            result.posts_fetched = len(raw_posts)

            if raw_posts:
                result.posts_upserted = await self._repo.upsert_posts(
                    raw_posts
                )
                logger.info("Upserted %d posts", result.posts_upserted)

            # Product Hunt
            try:
                products = await self._producthunt.fetch_recent_products()
                if products:
                    count = await self._repo.upsert_products(products)
                    logger.info("Upserted %d products from Product Hunt", count)
            except Exception:
                logger.exception("Product Hunt fetch failed")
                result.errors.append("Product Hunt fetch failed")
        except Exception:
            logger.exception("Fetch stage failed")
            result.errors.append("Fetch stage failed")

    async def _stage_tag(self, result: PipelineRunResult) -> None:
        try:
            pending = await self._repo.get_pending_posts()
            if not pending:
                logger.info("No pending posts to tag")
                return

            logger.info("Tagging %d pending posts", len(pending))

            existing_slugs = await self._repo.get_existing_tag_slugs()

            for i in range(0, len(pending), TAGGING_BATCH_SIZE):
                batch = pending[i : i + TAGGING_BATCH_SIZE]
                batch_ids = [p.id for p in batch]
                try:
                    tagging_results = await self._llm.tag_posts(
                        batch, existing_tags=existing_slugs,
                    )
                    await self._repo.save_tagging_results(tagging_results)
                    result.posts_tagged += len(tagging_results)
                    logger.info(
                        "Tagged batch of %d posts", len(tagging_results)
                    )
                except Exception as exc:
                    logger.exception(
                        "Tagging batch failed (posts %s)", batch_ids
                    )
                    await self._repo.mark_tagging_failed(batch_ids)
                    result.errors.append(
                        f"Tag batch failed ({len(batch)} posts): {type(exc).__name__}: {exc}"
                    )
                await asyncio.sleep(1)
        except Exception:
            logger.exception("Tag stage failed")
            result.errors.append("Tag stage failed")

    async def _stage_cluster(self, result: PipelineRunResult) -> None:
        try:
            posts = await self._repo.get_tagged_posts_without_cluster()
            if not posts:
                logger.info("No unclustered posts")
                return

            logger.info("Clustering %d posts", len(posts))
            for i in range(0, len(posts), CLUSTERING_BATCH_SIZE):
                batch = posts[i : i + CLUSTERING_BATCH_SIZE]
                clusters = await self._llm.cluster_posts(batch)
                await self._repo.save_clusters(clusters)
                result.clusters_created += len(clusters)
            logger.info("Created %d clusters", result.clusters_created)
        except Exception as exc:
            logger.exception("Cluster stage failed")
            result.errors.append(f"Cluster stage failed: {exc}")

    async def _stage_brief(self, result: PipelineRunResult) -> None:
        try:
            clusters = await self._repo.get_clusters_without_briefs()
            if not clusters:
                logger.info("No clusters without briefs")
                return

            logger.info(
                "Generating briefs for %d clusters", len(clusters)
            )
            for cluster_id, label, summary, posts in clusters:
                try:
                    # Fetch trends data — extract short, meaningful keywords
                    words = (label + " " + summary).split()
                    keywords = [
                        w[:80] for w in words
                        if len(w) > 2
                        and w.lower().strip("'\",.!?") not in _TRENDS_STOP_WORDS
                    ][:5]
                    if not keywords:
                        keywords = [label[:80]]
                    trends_data = None
                    try:
                        trends_data = await self._trends.get_interest(keywords)
                    except Exception:
                        logger.warning("Trends fetch failed for cluster %d", cluster_id)

                    # Find related products
                    related_products = None
                    try:
                        related_products = await self._repo.find_related_products(label)
                    except Exception:
                        logger.warning("Related products lookup failed for cluster %d", cluster_id)

                    draft = await self._llm.synthesize_brief(
                        label,
                        summary,
                        posts,
                        trends_data=trends_data,
                        related_products=related_products,
                    )
                    await self._repo.save_brief(cluster_id, draft)
                    result.briefs_generated += 1
                    logger.info(
                        "Generated brief for cluster %d: %s",
                        cluster_id,
                        draft.title,
                    )
                except Exception:
                    logger.exception(
                        "Brief generation failed for cluster %d",
                        cluster_id,
                    )
                    result.errors.append(
                        f"Brief generation failed for cluster {cluster_id}"
                    )
        except Exception:
            logger.exception("Brief stage failed")
            result.errors.append("Brief stage failed")
