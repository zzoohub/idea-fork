"""
RQ tasks for idea generation.

These tasks are executed by the RQ worker and handle:
- New idea generation (on-demand)
- Daily scheduled idea generation (batch)
- Forking existing ideas with modifications
- Progress tracking via job.meta
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from rq import get_current_job

from src.core.config import settings

logger = logging.getLogger(__name__)


def _configure_idea_core() -> None:
    """Configure the idea-core package with worker settings."""
    from idea_core.pipeline.config import PipelineSettings, configure_settings

    pipeline_settings = PipelineSettings(
        anthropic_api_key=settings.anthropic_api_key,
        llm_model=settings.llm_model,
        llm_temperature=settings.llm_temperature,
        llm_max_tokens=settings.llm_max_tokens,
        database_url=settings.database_url,
    )
    configure_settings(pipeline_settings)


def _update_job_meta(status: str, message: str, progress: int = 0) -> None:
    """Update the current job's metadata with progress information.

    Args:
        status: Current status (GENERATING_CONCEPT, EXPANDING_PRD, CATEGORIZING, SAVING, COMPLETED, FAILED)
        message: Human-readable progress message
        progress: Progress percentage (0-100)
    """
    job = get_current_job()
    if job:
        job.meta["status"] = status
        job.meta["message"] = message
        job.meta["progress"] = progress
        job.meta["updated_at"] = datetime.now(timezone.utc).isoformat()
        job.save_meta()
        logger.debug(f"Job {job.id} progress: {status} - {message} ({progress}%)")


def _progress_callback(progress_data: dict) -> None:
    """Callback for progress updates from the pipeline.

    Maps GenerationProgress to job.meta updates.
    """
    status_map = {
        "queued": ("QUEUED", 0),
        "generating_concept": ("GENERATING_CONCEPT", 25),
        "expanding_prd": ("EXPANDING_PRD", 50),
        "categorizing": ("CATEGORIZING", 75),
        "saving": ("SAVING", 90),
        "completed": ("COMPLETED", 100),
        "failed": ("FAILED", 0),
    }

    status = progress_data.get("status", "queued")
    if hasattr(status, "value"):
        status = status.value

    mapped_status, default_progress = status_map.get(status, ("UNKNOWN", 0))
    message = progress_data.get("message", "Processing...")

    _update_job_meta(mapped_status, message, default_progress)


def generate_idea_task(
    user_id: Optional[str] = None,
    request_id: Optional[str] = None,
) -> dict[str, Any]:
    """RQ task to generate a new idea.

    This task runs synchronously in the RQ worker but internally uses
    asyncio to run the async LangGraph pipeline.

    Args:
        user_id: Optional user ID who requested the generation
        request_id: Optional request ID for tracking (stored in job.meta)

    Returns:
        Dict with idea_id, idea_slug on success, or error on failure
    """
    job = get_current_job()
    run_id = str(uuid.uuid4())[:8]

    logger.info(f"[{run_id}] Starting idea generation task (job_id={job.id if job else 'none'})")

    # Store request_id in job meta for later correlation
    if job and request_id:
        job.meta["request_id"] = request_id
        job.save_meta()

    # Configure idea-core with worker settings
    _configure_idea_core()

    # Update initial progress
    _update_job_meta("GENERATING_CONCEPT", "Starting idea generation...", 10)

    try:
        # Import here to ensure configuration is applied first
        from idea_core.pipeline.graph import generate_single_idea
        from idea_core.pipeline.repository import IdeaCoreRepository, get_async_session

        async def _run_generation():
            # Get available categories
            async with get_async_session() as session:
                repo = IdeaCoreRepository(session)
                available_categories = await repo.get_all_category_slugs()

            if not available_categories:
                logger.warning(f"[{run_id}] No categories found, using defaults")
                available_categories = ["saas", "ai", "productivity"]

            # Generate the idea
            idea_id, idea_slug, error = await generate_single_idea(
                run_id=run_id,
                idea_index=0,
                available_categories=available_categories,
                user_id=user_id,
                progress_callback=_progress_callback,
            )

            return idea_id, idea_slug, error

        # Run the async function synchronously
        idea_id, idea_slug, error = asyncio.run(_run_generation())

        if idea_id and idea_slug:
            _update_job_meta("COMPLETED", f"Successfully generated idea: {idea_slug}", 100)
            logger.info(f"[{run_id}] Task completed: idea_id={idea_id}, slug={idea_slug}")
            return {
                "success": True,
                "idea_id": idea_id,
                "idea_slug": idea_slug,
            }
        else:
            _update_job_meta("FAILED", error or "Unknown error", 0)
            logger.error(f"[{run_id}] Task failed: {error}")
            return {
                "success": False,
                "error": error or "Unknown error",
            }

    except Exception as e:
        error_msg = str(e)
        _update_job_meta("FAILED", error_msg, 0)
        logger.error(f"[{run_id}] Task exception: {e}", exc_info=True)
        return {
            "success": False,
            "error": error_msg,
        }


def fork_idea_task(
    fork_from_slug: str,
    user_id: Optional[str] = None,
    request_id: Optional[str] = None,
    modifications: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """RQ task to fork an existing idea with optional modifications.

    Args:
        fork_from_slug: Slug of the idea to fork
        user_id: Optional user ID who requested the fork
        request_id: Optional request ID for tracking
        modifications: Optional modifications to apply:
            - focus: New focus for the idea
            - target_audience: New target audience
            - industry: Apply to a different industry
            - additional_notes: Any additional context

    Returns:
        Dict with idea_id, idea_slug on success, or error on failure
    """
    job = get_current_job()
    run_id = str(uuid.uuid4())[:8]

    logger.info(
        f"[{run_id}] Starting fork task for {fork_from_slug} "
        f"(job_id={job.id if job else 'none'})"
    )

    # Store request_id in job meta
    if job and request_id:
        job.meta["request_id"] = request_id
        job.meta["fork_from_slug"] = fork_from_slug
        job.save_meta()

    # Configure idea-core
    _configure_idea_core()

    # Update initial progress
    _update_job_meta("GENERATING_CONCEPT", f"Forking idea: {fork_from_slug}...", 10)

    try:
        from idea_core.pipeline.graph import fork_idea
        from idea_core.pipeline.repository import IdeaCoreRepository, get_async_session

        async def _run_fork():
            # Get available categories
            async with get_async_session() as session:
                repo = IdeaCoreRepository(session)
                available_categories = await repo.get_all_category_slugs()

            if not available_categories:
                available_categories = ["saas", "ai", "productivity"]

            # Fork the idea
            idea_id, idea_slug, error = await fork_idea(
                run_id=run_id,
                forked_from_slug=fork_from_slug,
                available_categories=available_categories,
                user_id=user_id,
                modifications=modifications,
                progress_callback=_progress_callback,
            )

            return idea_id, idea_slug, error

        # Run the async function synchronously
        idea_id, idea_slug, error = asyncio.run(_run_fork())

        if idea_id and idea_slug:
            _update_job_meta("COMPLETED", f"Successfully forked idea: {idea_slug}", 100)
            logger.info(f"[{run_id}] Fork completed: idea_id={idea_id}, slug={idea_slug}")
            return {
                "success": True,
                "idea_id": idea_id,
                "idea_slug": idea_slug,
                "forked_from": fork_from_slug,
            }
        else:
            _update_job_meta("FAILED", error or "Unknown error", 0)
            logger.error(f"[{run_id}] Fork failed: {error}")
            return {
                "success": False,
                "error": error or "Unknown error",
            }

    except Exception as e:
        error_msg = str(e)
        _update_job_meta("FAILED", error_msg, 0)
        logger.error(f"[{run_id}] Fork exception: {e}", exc_info=True)
        return {
            "success": False,
            "error": error_msg,
        }


def generate_daily_ideas_task(count: int = 3) -> dict[str, Any]:
    """RQ task to generate multiple ideas for scheduled daily runs.

    This task is called by rq-scheduler for daily batch generation.
    It generates the specified number of ideas sequentially.

    Args:
        count: Number of ideas to generate (default: 3)

    Returns:
        Dict with results summary including successful and failed generations
    """
    job = get_current_job()
    run_id = str(uuid.uuid4())[:8]
    start_time = datetime.now(timezone.utc)

    logger.info(
        f"[{run_id}] Starting daily idea generation task "
        f"(job_id={job.id if job else 'none'}, count={count})"
    )

    # Store metadata
    if job:
        job.meta["type"] = "daily_generation"
        job.meta["target_count"] = count
        job.meta["started_at"] = start_time.isoformat()
        job.save_meta()

    # Configure idea-core with worker settings
    _configure_idea_core()

    _update_job_meta(
        "GENERATING_CONCEPT",
        f"Starting daily generation of {count} ideas...",
        5,
    )

    results = {
        "success": True,
        "generated": [],
        "failed": [],
        "total_requested": count,
    }

    try:
        from idea_core.pipeline.graph import generate_single_idea
        from idea_core.pipeline.repository import IdeaCoreRepository, get_async_session

        async def _run_batch_generation():
            # Get available categories once
            async with get_async_session() as session:
                repo = IdeaCoreRepository(session)
                available_categories = await repo.get_all_category_slugs()

            if not available_categories:
                logger.warning(f"[{run_id}] No categories found, using defaults")
                available_categories = ["saas", "ai", "productivity"]

            generated = []
            failed = []

            for i in range(count):
                idea_run_id = f"{run_id}-{i+1}"
                progress_pct = int(10 + (80 * i / count))

                _update_job_meta(
                    "GENERATING_CONCEPT",
                    f"Generating idea {i+1}/{count}...",
                    progress_pct,
                )

                try:
                    idea_id, idea_slug, error = await generate_single_idea(
                        run_id=idea_run_id,
                        idea_index=i,
                        available_categories=available_categories,
                        user_id=None,  # System-generated
                        progress_callback=None,  # No per-idea progress for batch
                    )

                    if idea_id and idea_slug:
                        generated.append({
                            "idea_id": idea_id,
                            "idea_slug": idea_slug,
                        })
                        logger.info(
                            f"[{idea_run_id}] Generated idea {i+1}/{count}: {idea_slug}"
                        )
                    else:
                        failed.append({
                            "index": i + 1,
                            "error": error or "Unknown error",
                        })
                        logger.warning(
                            f"[{idea_run_id}] Failed to generate idea {i+1}/{count}: {error}"
                        )

                except Exception as e:
                    failed.append({
                        "index": i + 1,
                        "error": str(e),
                    })
                    logger.error(
                        f"[{idea_run_id}] Exception generating idea {i+1}/{count}: {e}",
                        exc_info=True,
                    )

            return generated, failed

        # Run the async batch generation
        generated, failed = asyncio.run(_run_batch_generation())

        results["generated"] = generated
        results["failed"] = failed

        # Calculate duration
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()
        results["duration_seconds"] = duration

        # Determine overall success
        if len(failed) > 0:
            if len(generated) == 0:
                results["success"] = False
                _update_job_meta(
                    "FAILED",
                    f"All {count} ideas failed to generate",
                    0,
                )
            else:
                _update_job_meta(
                    "COMPLETED",
                    f"Generated {len(generated)}/{count} ideas ({len(failed)} failed)",
                    100,
                )
        else:
            _update_job_meta(
                "COMPLETED",
                f"Successfully generated {len(generated)} ideas",
                100,
            )

        logger.info(
            f"[{run_id}] Daily generation completed in {duration:.1f}s: "
            f"{len(generated)} succeeded, {len(failed)} failed"
        )

        return results

    except Exception as e:
        error_msg = str(e)
        _update_job_meta("FAILED", error_msg, 0)
        logger.error(f"[{run_id}] Daily generation exception: {e}", exc_info=True)
        return {
            "success": False,
            "error": error_msg,
            "generated": results.get("generated", []),
            "failed": results.get("failed", []),
            "total_requested": count,
        }
