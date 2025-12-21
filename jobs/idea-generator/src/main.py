"""
Main entry point for the idea generator job.

Supports two modes:
1. Scheduler mode (default): Runs the job on a schedule
2. One-shot mode: Runs the job once and exits

Usage:
    # Run with scheduler
    python -m src.main

    # Run once immediately
    python -m src.main --run-once

    # Run once with custom count
    python -m src.main --run-once --count 5
"""

import argparse
import asyncio
import signal
import sys
from typing import Optional

from src.core.config import settings
from src.core.logging import get_logger, setup_logging
from src.db.database import close_db, init_db
from src.scheduler.config import create_scheduler, get_daily_trigger
from src.scheduler.jobs import run_idea_generation_job

logger = get_logger(__name__)

# Global scheduler reference for signal handling
_scheduler = None


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Idea Generator - AI-powered idea generation for Idea Fork"
    )
    parser.add_argument(
        "--run-once",
        action="store_true",
        help="Run the job once and exit (no scheduling)",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=None,
        help="Number of ideas to generate (only with --run-once)",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging",
    )

    return parser.parse_args()


def handle_shutdown(signum, frame) -> None:
    """Handle shutdown signals gracefully."""
    logger.info(f"Received signal {signum}, initiating shutdown...")
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
    sys.exit(0)


async def run_scheduler() -> None:
    """Run the scheduler in continuous mode."""
    global _scheduler

    logger.info("Starting idea generator in scheduler mode")
    logger.info(
        f"Scheduled to run daily at "
        f"{settings.schedule_hour:02d}:{settings.schedule_minute:02d} "
        f"{settings.schedule_timezone}"
    )
    logger.info(f"Will generate {settings.ideas_per_run} ideas per run")

    # Create scheduler
    _scheduler = create_scheduler()

    # Add the daily job
    _scheduler.add_job(
        run_idea_generation_job,
        trigger=get_daily_trigger(),
        id="daily_idea_generation",
        name="Daily Idea Generation",
        replace_existing=True,
    )

    # Start scheduler
    _scheduler.start()

    logger.info("Scheduler started, waiting for scheduled jobs...")

    # Keep running until interrupted
    try:
        while True:
            await asyncio.sleep(60)
    except asyncio.CancelledError:
        logger.info("Scheduler loop cancelled")
    finally:
        if _scheduler.running:
            _scheduler.shutdown()
        logger.info("Scheduler stopped")


async def run_once(count: Optional[int] = None) -> None:
    """Run the job once and exit.

    Args:
        count: Number of ideas to generate (uses config default if None)
    """
    ideas_count = count or settings.ideas_per_run
    logger.info(f"Running one-shot generation of {ideas_count} ideas")

    # Import here to avoid circular imports
    from src.agents.graph import generate_ideas

    try:
        idea_ids = await generate_ideas(count=ideas_count)
        logger.info(f"Generated {len(idea_ids)} ideas: {idea_ids}")

        if len(idea_ids) == ideas_count:
            logger.info("All ideas generated successfully")
        else:
            logger.warning(
                f"Only {len(idea_ids)}/{ideas_count} ideas were generated"
            )

    except Exception as e:
        logger.error(f"Generation failed: {e}", exc_info=True)
        sys.exit(1)


async def main() -> None:
    """Main entry point."""
    args = parse_args()

    # Override debug from CLI
    if args.debug:
        settings.debug = True
        settings.log_level = "DEBUG"

    # Setup logging
    setup_logging()

    logger.info(f"Starting {settings.app_name}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"LLM model: {settings.llm_model}")

    # Setup signal handlers
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    # Initialize database
    try:
        await init_db()
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        sys.exit(1)

    try:
        if args.run_once:
            await run_once(args.count)
        else:
            await run_scheduler()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
