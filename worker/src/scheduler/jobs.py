"""
Scheduled job functions for rq-scheduler.

Contains the job registration functions that set up daily idea generation.
"""

import logging
from datetime import datetime
from typing import cast
from zoneinfo import ZoneInfo

from redis import Redis
from rq import Queue
from rq.job import Job
from rq_scheduler import Scheduler

from src.core.config import settings
from src.scheduler.config import scheduler_settings

logger = logging.getLogger(__name__)


def get_scheduler(redis_conn: Redis) -> Scheduler:
    """Create and return an rq-scheduler instance.

    Args:
        redis_conn: Redis connection

    Returns:
        Configured Scheduler instance
    """
    return Scheduler(connection=redis_conn)


def schedule_daily_idea_generation(scheduler: Scheduler, queue_name: str) -> None:
    """Schedule the daily idea generation job.

    This function registers a daily cron job with rq-scheduler that will
    enqueue the generate_daily_ideas_task at the configured time.

    Args:
        scheduler: The rq-scheduler instance
        queue_name: Name of the queue to enqueue jobs to
    """
    from src.tasks.idea_generation import generate_daily_ideas_task

    # Build cron expression: minute hour * * *
    cron_string = f"{scheduler_settings.schedule_minute} {scheduler_settings.schedule_hour} * * *"

    # Cancel any existing scheduled job with the same ID
    job_id = "daily_idea_generation"

    # Check if job already exists and cancel it
    for job in cast(list[Job], scheduler.get_jobs()):
        if job.id == job_id:
            scheduler.cancel(job)
            logger.info(f"Cancelled existing scheduled job: {job_id}")
            break

    # Schedule the new job
    scheduler.cron(
        cron_string=cron_string,
        func=generate_daily_ideas_task,
        args=[scheduler_settings.ideas_per_day],
        id=job_id,
        queue_name=queue_name,
        timeout=settings.job_timeout,
        result_ttl=settings.result_ttl,
        meta={
            "scheduled": True,
            "type": "daily_generation",
            "ideas_per_run": scheduler_settings.ideas_per_day,
        },
    )

    # Calculate next run time for logging
    tz = ZoneInfo(scheduler_settings.schedule_timezone)
    now = datetime.now(tz)
    next_run_hour = scheduler_settings.schedule_hour
    next_run_minute = scheduler_settings.schedule_minute

    logger.info(
        f"Scheduled daily idea generation: "
        f"{next_run_hour:02d}:{next_run_minute:02d} {scheduler_settings.schedule_timezone} "
        f"({scheduler_settings.ideas_per_day} ideas per run)"
    )
    logger.info(f"Cron expression: {cron_string}")


def run_scheduler_loop(redis_conn: Redis, queue_name: str) -> None:
    """Run the rq-scheduler in continuous mode.

    This function starts the scheduler and keeps it running to process
    scheduled jobs. It should be run in its own process.

    Args:
        redis_conn: Redis connection
        queue_name: Name of the queue for scheduled jobs
    """
    scheduler = get_scheduler(redis_conn)

    # Register the daily job
    schedule_daily_idea_generation(scheduler, queue_name)

    logger.info("Starting rq-scheduler loop...")
    logger.info(f"Scheduler will enqueue jobs to queue: {queue_name}")

    # Run the scheduler (blocking)
    scheduler.run()
