import asyncio
import hmac
import logging
import sys

from domain.pipeline.service import PipelineService
from outbound.llm.client import GeminiLlmClient
from outbound.postgres.database import Database
from outbound.postgres.pipeline_repository import PostgresPipelineRepository
from outbound.producthunt.client import ProductHuntApiClient
from outbound.reddit.client import RedditApiClient
from outbound.rss.client import RssFeedClient
from outbound.trends.client import GoogleTrendsClient
from shared.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _validate_credentials(settings) -> None:
    missing = []
    if not settings.GOOGLE_API_KEY:
        missing.append("GOOGLE_API_KEY")
    if missing:
        msg = f"Missing required env vars: {', '.join(missing)}"
        raise SystemExit(msg)


async def reset_data() -> int:
    settings = get_settings()
    if not settings.API_INTERNAL_SECRET:
        logger.error("API_INTERNAL_SECRET must be set to run reset")
        return 1

    # Require matching secret as CLI argument
    provided = sys.argv[2] if len(sys.argv) > 2 else ""
    if not hmac.compare_digest(provided, settings.API_INTERNAL_SECRET):
        logger.error("Invalid secret provided for reset")
        return 1

    db = Database(settings.API_DATABASE_URL)
    try:
        async with db.session() as session:
            from sqlalchemy import text

            await session.execute(
                text(
                    "TRUNCATE brief_source, rating, brief, cluster_post, "
                    "cluster, post_tag, tag, post, product CASCADE"
                )
            )
            await session.commit()
        logger.info("All pipeline data has been reset")
        return 0
    finally:
        await db.dispose()


async def main() -> int:
    settings = get_settings()
    _validate_credentials(settings)

    db = Database(settings.API_DATABASE_URL)

    try:
        repo = PostgresPipelineRepository(db)
        reddit = RedditApiClient(user_agent=settings.REDDIT_USER_AGENT)
        llm = GeminiLlmClient(
            api_key=settings.GOOGLE_API_KEY,
            model=settings.LLM_MODEL,
            lite_model=settings.LLM_LITE_MODEL,
            brief_temperature=settings.LLM_BRIEF_TEMPERATURE,
        )
        rss = RssFeedClient()
        trends = GoogleTrendsClient()
        producthunt = ProductHuntApiClient(
            api_token=settings.PRODUCTHUNT_API_TOKEN,
        )

        subreddits = [s.strip() for s in settings.PIPELINE_SUBREDDITS.split(",")]
        rss_feeds = [f.strip() for f in settings.PIPELINE_RSS_FEEDS.split(",") if f.strip()]

        service = PipelineService(
            repo=repo,
            reddit=reddit,
            llm=llm,
            rss=rss,
            trends=trends,
            producthunt=producthunt,
            subreddits=subreddits,
            rss_feeds=rss_feeds,
            fetch_limit=settings.PIPELINE_FETCH_LIMIT,
        )

        result = await service.run()

        logger.info(
            "Pipeline complete: fetched=%d upserted=%d tagged=%d clusters=%d briefs=%d errors=%d",
            result.posts_fetched,
            result.posts_upserted,
            result.posts_tagged,
            result.clusters_created,
            result.briefs_generated,
            len(result.errors),
        )

        if result.errors:
            for error in result.errors:
                logger.error("  - %s", error)
            return 1

        return 0
    finally:
        await db.dispose()


if __name__ == "__main__":  # pragma: no cover
    command = sys.argv[1] if len(sys.argv) > 1 else "run"
    if command == "reset":
        sys.exit(asyncio.run(reset_data()))
    else:
        sys.exit(asyncio.run(main()))
