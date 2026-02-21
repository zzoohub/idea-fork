import logging

from domain.pipeline.models import PipelineRunResult
from domain.pipeline.ports import LlmClient, PipelineRepository, RedditClient

logger = logging.getLogger(__name__)

TAGGING_BATCH_SIZE = 20
CLUSTERING_BATCH_SIZE = 200


class PipelineService:
    def __init__(
        self,
        repo: PipelineRepository,
        reddit: RedditClient,
        llm: LlmClient,
        subreddits: list[str],
        fetch_limit: int = 100,
    ) -> None:
        self._repo = repo
        self._reddit = reddit
        self._llm = llm
        self._subreddits = subreddits
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
            raw_posts = await self._reddit.fetch_posts(
                subreddits=self._subreddits,
                limit=self._fetch_limit,
            )
            result.posts_fetched = len(raw_posts)
            logger.info("Fetched %d posts from Reddit", len(raw_posts))

            if raw_posts:
                result.posts_upserted = await self._repo.upsert_posts(
                    raw_posts
                )
                logger.info("Upserted %d posts", result.posts_upserted)
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

            for i in range(0, len(pending), TAGGING_BATCH_SIZE):
                batch = pending[i : i + TAGGING_BATCH_SIZE]
                batch_ids = [p.id for p in batch]
                try:
                    tagging_results = await self._llm.tag_posts(batch)
                    await self._repo.save_tagging_results(tagging_results)
                    result.posts_tagged += len(tagging_results)
                    logger.info(
                        "Tagged batch of %d posts", len(tagging_results)
                    )
                except Exception:
                    logger.exception(
                        "Tagging batch failed (posts %s)", batch_ids
                    )
                    await self._repo.mark_tagging_failed(batch_ids)
                    result.errors.append(
                        f"Tag batch failed ({len(batch)} posts)"
                    )
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
        except Exception:
            logger.exception("Cluster stage failed")
            result.errors.append("Cluster stage failed")

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
                    draft = await self._llm.synthesize_brief(
                        label, summary, posts
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
