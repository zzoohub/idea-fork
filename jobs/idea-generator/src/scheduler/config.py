"""
Scheduler configuration for APScheduler.

Defines the scheduler setup and default job settings.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


def create_scheduler() -> AsyncIOScheduler:
    """Create and configure the AsyncIOScheduler.

    Returns:
        Configured AsyncIOScheduler instance
    """
    scheduler = AsyncIOScheduler(
        timezone=settings.schedule_timezone,
        job_defaults={
            "coalesce": True,  # Combine missed runs into one
            "max_instances": 1,  # Only one instance of each job at a time
            "misfire_grace_time": 3600,  # 1 hour grace period for missed jobs
        },
    )

    logger.debug(
        f"Scheduler created with timezone={settings.schedule_timezone}"
    )

    return scheduler


def get_daily_trigger() -> CronTrigger:
    """Get cron trigger for daily job execution.

    Returns:
        CronTrigger set to run at configured hour
    """
    trigger = CronTrigger(
        hour=settings.schedule_hour,
        minute=settings.schedule_minute,
        timezone=settings.schedule_timezone,
    )

    logger.debug(
        f"Daily trigger configured for "
        f"{settings.schedule_hour:02d}:{settings.schedule_minute:02d} "
        f"{settings.schedule_timezone}"
    )

    return trigger
