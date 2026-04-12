import asyncio
import logging

from domain.pipeline.models import PipelineRunResult, RawPost
from domain.pipeline.ports import (
    AppStoreClient,
    LlmClient,
    PipelineRepository,
    PlayStoreClient,
    ProductHuntClient,
    RedditClient,
    RssClient,
    SafetyFilteredError,
    TrendsClient,
)

logger = logging.getLogger(__name__)

TAGGING_BATCH_SIZE = 20
CLUSTERING_BATCH_SIZE = 200
REVIEW_CONCURRENCY = 3
BRIEF_CONCURRENCY = 3


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
        appstore: AppStoreClient | None = None,
        playstore: PlayStoreClient | None = None,
        appstore_keywords: list[str] | None = None,
        appstore_review_pages: int = 3,
        playstore_review_count: int = 100,
        appstore_max_age_days: int = 365,
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
        self._appstore = appstore
        self._playstore = playstore
        self._appstore_keywords = appstore_keywords or []
        self._appstore_review_pages = appstore_review_pages
        self._playstore_review_count = playstore_review_count
        self._max_age_days = appstore_max_age_days

    async def is_running(self) -> bool:
        return await self._repo.is_advisory_lock_held()

    async def get_pending_counts(self) -> dict[str, int]:
        return await self._repo.get_pending_counts()

    async def run(self, *, skip_fetch: bool = False) -> PipelineRunResult:
        result = PipelineRunResult()

        locked = await self._repo.acquire_advisory_lock()
        if not locked:
            logger.warning(
                "Pipeline already running (advisory lock held), skipping"
            )
            result.errors.append("Could not acquire advisory lock")
            return result

        try:
            if not skip_fetch:
                await self._stage_fetch(result)
            await self._stage_tag(result)
            await self._stage_score_products(result)
            await self._stage_cluster(result)
            await self._stage_brief(result)
        finally:
            await self._repo.release_advisory_lock()

        return result

    # ------------------------------------------------------------------
    # Stage: Fetch — parallel data sources
    # ------------------------------------------------------------------

    async def _stage_fetch(self, result: PipelineRunResult) -> None:
        try:
            tasks = [
                self._fetch_reddit_rss(result),
                self._fetch_producthunt(result),
            ]
            if self._appstore and self._appstore_keywords:
                tasks.append(self._fetch_appstore(result))
            if self._playstore and self._appstore_keywords:
                tasks.append(self._fetch_playstore(result))

            await asyncio.gather(*tasks)
        except Exception:
            logger.exception("Fetch stage failed")
            result.errors.append("Fetch stage failed")

    async def _fetch_reddit_rss(self, result: PipelineRunResult) -> None:
        raw_posts: list[RawPost] = await self._reddit.fetch_posts(
            subreddits=self._subreddits,
            limit=self._fetch_limit,
        )
        logger.info("Fetched %d posts from Reddit", len(raw_posts))

        if self._rss_feeds:
            rss_posts = await self._rss.fetch_posts(self._rss_feeds)
            logger.info("Fetched %d posts from RSS", len(rss_posts))
            raw_posts = raw_posts + rss_posts

        result.posts_fetched += len(raw_posts)

        if raw_posts:
            upserted = await self._repo.upsert_posts(raw_posts)
            result.posts_upserted += upserted
            logger.info("Upserted %d posts", upserted)

    async def _fetch_producthunt(self, result: PipelineRunResult) -> None:
        try:
            products = await self._producthunt.fetch_recent_products()
            if products:
                count = await self._repo.upsert_products(products)
                result.products_upserted += count
                logger.info("Upserted %d products from Product Hunt", count)
        except Exception:
            logger.exception("Product Hunt fetch failed")
            result.errors.append("Product Hunt fetch failed")

    async def _fetch_appstore(self, result: PipelineRunResult) -> None:
        async def _get_reviews(product):
            return await self._appstore.fetch_reviews(
                product.external_id, pages=self._appstore_review_pages
            )

        await self._fetch_store(
            result,
            client=self._appstore,
            store_name="App Store",
            fetch_reviews=_get_reviews,
        )

    async def _fetch_playstore(self, result: PipelineRunResult) -> None:
        async def _get_reviews(product):
            return await self._playstore.fetch_reviews(
                product.external_id, count=self._playstore_review_count
            )

        await self._fetch_store(
            result,
            client=self._playstore,
            store_name="Play Store",
            fetch_reviews=_get_reviews,
        )

    async def _fetch_store(
        self,
        result: PipelineRunResult,
        *,
        client,
        store_name: str,
        fetch_reviews,
    ) -> None:
        """Shared logic for App Store / Play Store: search apps → upsert → fetch reviews."""
        try:
            products = await client.search_apps(
                self._appstore_keywords, max_age_days=self._max_age_days
            )
            if products:
                count = await self._repo.upsert_products(products)
                result.products_upserted += count
                logger.info("Upserted %d products from %s", count, store_name)

            sem = asyncio.Semaphore(REVIEW_CONCURRENCY)

            async def _review_task(product):
                async with sem:
                    try:
                        reviews = await fetch_reviews(product)
                        if reviews:
                            upserted = await self._repo.upsert_posts(reviews)
                            result.posts_fetched += len(reviews)
                            result.posts_upserted += upserted
                            logger.info(
                                "Upserted %d %s reviews for %s",
                                upserted, store_name, product.name,
                            )
                    except Exception:
                        logger.exception(
                            "%s review fetch failed for %s",
                            store_name, product.external_id,
                        )

            await asyncio.gather(*[_review_task(p) for p in products])
        except Exception:
            logger.exception("%s fetch failed", store_name)
            result.errors.append(f"{store_name} fetch failed")

    # ------------------------------------------------------------------
    # Stage: Tag
    # ------------------------------------------------------------------

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
                await asyncio.sleep(0.3)
        except Exception:
            logger.exception("Tag stage failed")
            result.errors.append("Tag stage failed")

    # ------------------------------------------------------------------
    # Stage: Score products
    # ------------------------------------------------------------------

    async def _stage_score_products(self, result: PipelineRunResult) -> None:
        try:
            updated = await self._repo.update_product_scores()
            logger.info("Updated scores for %d products", updated)
        except Exception:
            logger.exception("Score products stage failed")
            result.errors.append("Score products stage failed")

    # ------------------------------------------------------------------
    # Stage: Cluster
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Stage: Brief — semaphore-bounded parallel generation
    # ------------------------------------------------------------------

    async def _stage_brief(self, result: PipelineRunResult) -> None:
        try:
            clusters = await self._repo.get_clusters_without_briefs()
            if not clusters:
                logger.info("No clusters without briefs")
                return

            logger.info(
                "Generating briefs for %d clusters", len(clusters)
            )

            sem = asyncio.Semaphore(BRIEF_CONCURRENCY)

            async def _gen_brief(cluster_id, label, summary, trend_keywords, posts):
                async with sem:
                    try:
                        keywords = trend_keywords[:5] if trend_keywords else [label[:80]]

                        logger.info(
                            "Trends keywords for cluster %d: %s",
                            cluster_id,
                            keywords,
                        )

                        # Fetch trends + related products in parallel
                        trends_result, products_result = await asyncio.gather(
                            self._safe_get_trends(cluster_id, keywords),
                            self._safe_find_related(cluster_id, label),
                        )

                        draft = await self._llm.synthesize_brief(
                            label,
                            summary,
                            posts,
                            trends_data=trends_result,
                            related_products=products_result,
                        )
                        await self._repo.save_brief(cluster_id, draft)
                        result.briefs_generated += 1
                        logger.info(
                            "Generated brief for cluster %d: %s",
                            cluster_id,
                            draft.title,
                        )
                    except SafetyFilteredError:
                        logger.warning(
                            "Cluster %d archived (safety-filtered by LLM)",
                            cluster_id,
                        )
                        await self._repo.archive_cluster(cluster_id)
                    except Exception:
                        logger.exception(
                            "Brief generation failed for cluster %d",
                            cluster_id,
                        )
                        result.errors.append(
                            f"Brief generation failed for cluster {cluster_id}"
                        )

            await asyncio.gather(
                *[
                    _gen_brief(cid, label, summary, trend_kw, posts)
                    for cid, label, summary, trend_kw, posts in clusters
                ]
            )
        except Exception:
            logger.exception("Brief stage failed")
            result.errors.append("Brief stage failed")

    async def _safe_get_trends(
        self, cluster_id: int, keywords: list[str]
    ) -> dict | None:
        try:
            return await self._trends.get_interest(keywords)
        except Exception:
            logger.warning("Trends fetch failed for cluster %d", cluster_id)
            return None

    async def _safe_find_related(
        self, cluster_id: int, label: str
    ) -> list | None:
        try:
            return await self._repo.find_related_products(label)
        except Exception:
            logger.warning(
                "Related products lookup failed for cluster %d", cluster_id
            )
            return None
