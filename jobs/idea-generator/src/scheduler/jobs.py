"""
Job definitions for the idea generator scheduler.

Contains the actual job functions that get scheduled.
"""

import asyncio
from datetime import datetime, timezone

from src.agents.graph import generate_ideas
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


async def run_idea_generation_job() -> None:
    """Execute the idea generation job.

    This is the main job function called by the scheduler.
    It generates the configured number of ideas and logs the results.
    """
    start_time = datetime.now(timezone.utc)
    logger.info(
        f"Starting idea generation job at {start_time.isoformat()} "
        f"(generating {settings.ideas_per_run} ideas)"
    )

    try:
        # Generate ideas
        idea_ids = await generate_ideas(count=settings.ideas_per_run)

        # Calculate duration
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()

        logger.info(
            f"Idea generation job completed in {duration:.1f}s: "
            f"created {len(idea_ids)} ideas (IDs: {idea_ids})"
        )

        # Log summary
        if len(idea_ids) < settings.ideas_per_run:
            failed_count = settings.ideas_per_run - len(idea_ids)
            logger.warning(
                f"{failed_count} idea(s) failed to generate in this run"
            )

    except Exception as e:
        logger.error(f"Idea generation job failed with error: {e}", exc_info=True)
        raise


def sync_run_idea_generation_job() -> None:
    """Synchronous wrapper for the async job.

    APScheduler's AsyncIOScheduler can handle async functions directly,
    but this wrapper is provided for compatibility.
    """
    asyncio.run(run_idea_generation_job())
