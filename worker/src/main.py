"""
RQ Worker entry point for idea generation.

This module starts the RQ worker and/or scheduler for idea generation tasks.

Usage:
    # Run RQ worker only (processes jobs from queue)
    python -m src.main worker

    # Run rq-scheduler only (schedules daily generation)
    python -m src.main scheduler

    # Run both worker and scheduler (default)
    python -m src.main all
    python -m src.main

    # Options
    --burst     Run worker in burst mode (process all jobs then exit)
    --debug     Enable debug logging
    --queue     Override queue name
"""

import argparse
import logging
import multiprocessing
import signal
import sys
from typing import Literal

from redis import Redis
from rq import Worker

from src.core.config import settings
from src.core.logging import get_logger, setup_logging
from src.scheduler.config import scheduler_settings

# Import tasks to ensure they are registered
from src.tasks import fork_idea_task, generate_idea_task, generate_daily_ideas_task

logger = get_logger(__name__)

# Type for run modes
RunMode = Literal["worker", "scheduler", "all"]


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Idea Fork Worker - RQ worker and scheduler for idea generation"
    )

    parser.add_argument(
        "mode",
        nargs="?",
        choices=["worker", "scheduler", "all"],
        default="all",
        help="Run mode: 'worker' (RQ only), 'scheduler' (rq-scheduler only), or 'all' (both, default)",
    )
    parser.add_argument(
        "--burst",
        action="store_true",
        help="Run in burst mode (process all jobs then exit, worker mode only)",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging",
    )
    parser.add_argument(
        "--queue",
        type=str,
        default=None,
        help=f"Queue name to process (default: {settings.queue_name})",
    )

    return parser.parse_args()


def get_redis_connection() -> Redis:
    """Create and verify Redis connection."""
    try:
        redis_conn = Redis.from_url(settings.redis_url)
        redis_conn.ping()
        logger.info("Connected to Redis successfully")
        return redis_conn
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        sys.exit(1)


def run_worker(redis_conn: Redis, queue_name: str, burst: bool = False) -> None:
    """Run the RQ worker.

    Args:
        redis_conn: Redis connection
        queue_name: Name of the queue to process
        burst: If True, process all jobs then exit
    """
    logger.info("Starting RQ worker...")
    logger.info(f"Queue: {queue_name}")
    logger.info(f"Job timeout: {settings.job_timeout}s")

    try:
        worker = Worker(
            queues=[queue_name],
            connection=redis_conn,
            default_worker_ttl=settings.job_timeout,
            default_result_ttl=settings.result_ttl,
            job_monitoring_interval=5,
        )

        if burst:
            logger.info("Running in burst mode...")
            worker.work(burst=True)
        else:
            logger.info("Starting worker loop...")
            worker.work(with_scheduler=False)

    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
    except Exception as e:
        logger.error(f"Worker error: {e}", exc_info=True)
        raise


def run_scheduler(redis_conn: Redis, queue_name: str) -> None:
    """Run the rq-scheduler.

    Args:
        redis_conn: Redis connection
        queue_name: Name of the queue for scheduled jobs
    """
    from src.scheduler.jobs import run_scheduler_loop

    logger.info("Starting rq-scheduler...")
    logger.info(
        f"Scheduled time: {scheduler_settings.schedule_hour:02d}:"
        f"{scheduler_settings.schedule_minute:02d} {scheduler_settings.schedule_timezone}"
    )
    logger.info(f"Ideas per day: {scheduler_settings.ideas_per_day}")

    try:
        run_scheduler_loop(redis_conn, queue_name)
    except KeyboardInterrupt:
        logger.info("Scheduler stopped by user")
    except Exception as e:
        logger.error(f"Scheduler error: {e}", exc_info=True)
        raise


def run_all(redis_conn: Redis, queue_name: str) -> None:
    """Run both worker and scheduler in separate processes.

    Args:
        redis_conn: Redis connection (note: each process will create its own)
        queue_name: Name of the queue
    """
    logger.info("Starting both worker and scheduler...")

    # Create separate processes for worker and scheduler
    # Each needs its own Redis connection
    worker_process = multiprocessing.Process(
        target=_worker_process_entry,
        args=(queue_name,),
        name="rq-worker",
    )
    scheduler_process = multiprocessing.Process(
        target=_scheduler_process_entry,
        args=(queue_name,),
        name="rq-scheduler",
    )

    # Start both processes
    worker_process.start()
    scheduler_process.start()

    logger.info(f"Worker process started (PID: {worker_process.pid})")
    logger.info(f"Scheduler process started (PID: {scheduler_process.pid})")

    def handle_shutdown(signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        worker_process.terminate()
        scheduler_process.terminate()
        worker_process.join(timeout=5)
        scheduler_process.join(timeout=5)
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    # Wait for processes
    try:
        worker_process.join()
        scheduler_process.join()
    except KeyboardInterrupt:
        logger.info("Received interrupt, shutting down processes...")
        worker_process.terminate()
        scheduler_process.terminate()
        worker_process.join(timeout=5)
        scheduler_process.join(timeout=5)


def _worker_process_entry(queue_name: str) -> None:
    """Entry point for worker subprocess."""
    setup_logging()
    redis_conn = get_redis_connection()
    run_worker(redis_conn, queue_name, burst=False)


def _scheduler_process_entry(queue_name: str) -> None:
    """Entry point for scheduler subprocess."""
    setup_logging()
    redis_conn = get_redis_connection()
    run_scheduler(redis_conn, queue_name)


def main() -> None:
    """Main entry point."""
    args = parse_args()

    # Override settings from CLI
    if args.debug:
        settings.debug = True
        settings.log_level = "DEBUG"

    # Setup logging
    setup_logging()

    queue_name = args.queue or settings.queue_name

    logger.info(f"Starting {settings.app_name}")
    logger.info(f"Mode: {args.mode}")
    logger.info(f"Redis URL: {settings.redis_url}")
    logger.info(f"Queue: {queue_name}")
    logger.info(f"Debug mode: {settings.debug}")

    # Connect to Redis
    redis_conn = get_redis_connection()

    try:
        if args.mode == "worker":
            run_worker(redis_conn, queue_name, args.burst)
        elif args.mode == "scheduler":
            run_scheduler(redis_conn, queue_name)
        else:  # "all"
            if args.burst:
                logger.warning("Burst mode ignored when running both worker and scheduler")
            run_all(redis_conn, queue_name)

    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
