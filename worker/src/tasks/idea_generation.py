"""
RQ tasks for idea generation.

These tasks are executed by the RQ worker and handle:
- Daily scheduled idea generation (batch) via API HTTP calls

Note: On-demand generation and forking are now handled directly by
the API via SSE streaming endpoints.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from rq import get_current_job

from src.core.config import settings

logger = logging.getLogger(__name__)


def _update_job_meta(status: str, message: str, progress: int = 0) -> None:
    """Update the current job's metadata with progress information.

    Args:
        status: Current status (GENERATING, COMPLETED, FAILED)
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


def _call_generate_api() -> dict[str, Any]:
    """Call the API to generate a single idea.

    Uses the non-streaming endpoint for batch generation.

    Returns:
        Dict with idea_id, idea_slug on success, or error on failure
    """
    url = f"{settings.api_url}/api/generation/ideas/generate"

    try:
        with httpx.Client(timeout=settings.api_timeout) as client:
            response = client.post(url, json={})

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "idea_id": data.get("idea_id"),
                    "idea_slug": data.get("idea_slug"),
                }
            else:
                error_detail = response.json().get("detail", response.text)
                return {
                    "success": False,
                    "error": f"API error ({response.status_code}): {error_detail}",
                }

    except httpx.TimeoutException:
        return {
            "success": False,
            "error": f"API timeout after {settings.api_timeout}s",
        }
    except httpx.RequestError as e:
        return {
            "success": False,
            "error": f"API request failed: {str(e)}",
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
        }


def generate_daily_ideas_task(count: int = 3) -> dict[str, Any]:
    """RQ task to generate multiple ideas for scheduled daily runs.

    This task is called by rq-scheduler for daily batch generation.
    It generates the specified number of ideas by calling the API.

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

    _update_job_meta(
        "GENERATING",
        f"Starting daily generation of {count} ideas...",
        5,
    )

    results = {
        "success": True,
        "generated": [],
        "failed": [],
        "total_requested": count,
    }

    for i in range(count):
        progress_pct = int(10 + (80 * i / count))

        _update_job_meta(
            "GENERATING",
            f"Generating idea {i + 1}/{count}...",
            progress_pct,
        )

        logger.info(f"[{run_id}] Generating idea {i + 1}/{count} via API")

        result = _call_generate_api()

        if result.get("success"):
            results["generated"].append({
                "idea_id": result.get("idea_id"),
                "idea_slug": result.get("idea_slug"),
            })
            logger.info(
                f"[{run_id}] Generated idea {i + 1}/{count}: {result.get('idea_slug')}"
            )
        else:
            results["failed"].append({
                "index": i + 1,
                "error": result.get("error", "Unknown error"),
            })
            logger.warning(
                f"[{run_id}] Failed to generate idea {i + 1}/{count}: {result.get('error')}"
            )

    # Calculate duration
    end_time = datetime.now(timezone.utc)
    duration = (end_time - start_time).total_seconds()
    results["duration_seconds"] = duration

    # Determine overall success
    generated_count = len(results["generated"])
    failed_count = len(results["failed"])

    if failed_count > 0:
        if generated_count == 0:
            results["success"] = False
            _update_job_meta(
                "FAILED",
                f"All {count} ideas failed to generate",
                0,
            )
        else:
            _update_job_meta(
                "COMPLETED",
                f"Generated {generated_count}/{count} ideas ({failed_count} failed)",
                100,
            )
    else:
        _update_job_meta(
            "COMPLETED",
            f"Successfully generated {generated_count} ideas",
            100,
        )

    logger.info(
        f"[{run_id}] Daily generation completed in {duration:.1f}s: "
        f"{generated_count} succeeded, {failed_count} failed"
    )

    return results
