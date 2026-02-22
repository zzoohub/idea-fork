import asyncio
import logging
import sys

from domain.pipeline.service import PipelineService
from outbound.llm.client import AnthropicLlmClient
from outbound.postgres.database import Database
from outbound.postgres.pipeline_repository import PostgresPipelineRepository
from outbound.reddit.client import RedditApiClient
from shared.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _validate_credentials(settings) -> None:
    missing = []
    if not settings.REDDIT_CLIENT_ID:
        missing.append("REDDIT_CLIENT_ID")
    if not settings.REDDIT_CLIENT_SECRET:
        missing.append("REDDIT_CLIENT_SECRET")
    if not settings.ANTHROPIC_API_KEY:
        missing.append("ANTHROPIC_API_KEY")
    if missing:
        msg = f"Missing required env vars: {', '.join(missing)}"
        raise SystemExit(msg)


async def main() -> int:
    settings = get_settings()
    _validate_credentials(settings)

    db = Database(settings.API_DATABASE_URL)

    try:
        repo = PostgresPipelineRepository(db)
        reddit = RedditApiClient(
            client_id=settings.REDDIT_CLIENT_ID,
            client_secret=settings.REDDIT_CLIENT_SECRET,
            user_agent=settings.REDDIT_USER_AGENT,
        )
        llm = AnthropicLlmClient(
            api_key=settings.ANTHROPIC_API_KEY,
            tagging_model=settings.LLM_TAGGING_MODEL,
            synthesis_model=settings.LLM_SYNTHESIS_MODEL,
        )

        subreddits = [s.strip() for s in settings.PIPELINE_SUBREDDITS.split(",")]

        service = PipelineService(
            repo=repo,
            reddit=reddit,
            llm=llm,
            subreddits=subreddits,
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
    sys.exit(asyncio.run(main()))
