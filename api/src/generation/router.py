"""
Generation API router for idea generation.

Provides endpoints for:
- POST /api/ideas/generate - Generate new idea (non-streaming, for batch/worker)
- POST /api/ideas/generate/stream - Generate new idea with real-time progress
- POST /api/ideas/{slug}/fork/stream - Fork existing idea with real-time progress
"""

import asyncio
import logging
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.generation.models.state import GenerationStatus
from src.generation.pipeline.graph import (
    fork_idea_stream,
    generate_single_idea,
    generate_single_idea_stream,
)
from src.generation.pipeline.repository import IdeaCoreRepository, get_async_session
from src.generation.schemas import (
    ForkIdeaRequest,
    GenerateIdeaRequest,
    GenerationProgressStatus,
    SSEProgressEvent,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Generation"])

# SSE generation timeout (5 minutes)
SSE_TIMEOUT_SECONDS = 300


class GenerateIdeaResponse(BaseModel):
    """Response for non-streaming idea generation."""

    idea_id: int
    idea_slug: str


@router.post(
    "/ideas/generate",
    summary="Generate idea (non-streaming)",
    description="Generate a new AI-powered product idea. Used for batch/worker operations.",
    response_model=GenerateIdeaResponse,
)
async def generate_idea(
    request: GenerateIdeaRequest = GenerateIdeaRequest(),
) -> GenerateIdeaResponse:
    """Generate idea without streaming (for worker/batch use)."""
    run_id = str(uuid.uuid4())[:8]

    try:
        # Get available taxonomies from database
        async with get_async_session() as session:
            repo = IdeaCoreRepository(session)
            available_functions = await repo.get_all_function_slugs()
            available_industries = await repo.get_all_industry_slugs()
            available_target_users = await repo.get_all_target_user_slugs()
            available_categories = await repo.get_all_category_slugs()

        # Fallback defaults
        if not available_functions:
            available_functions = ["create", "automate", "analyze", "connect"]
        if not available_industries:
            available_industries = ["technology", "healthcare", "finance", "education"]
        if not available_target_users:
            available_target_users = ["developers", "businesses", "consumers"]
        if not available_categories:
            available_categories = ["saas", "ai", "productivity"]

        # Generate the idea
        idea_id, idea_slug, error = await generate_single_idea(
            run_id=run_id,
            idea_index=0,
            available_functions=available_functions,
            available_industries=available_industries,
            available_target_users=available_target_users,
            available_categories=available_categories,
            function_slug=request.function_slug,
            industry_slug=request.industry_slug,
            idea_seed=request.idea_seed,
            user_id=None,
        )

        if idea_id and idea_slug:
            return GenerateIdeaResponse(idea_id=idea_id, idea_slug=idea_slug)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error or "Failed to generate idea",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{run_id}] Generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during idea generation",
        )


@router.post(
    "/ideas/generate/stream",
    summary="Generate idea with real-time SSE streaming",
    description="""
    Generate a new AI-powered product idea with real-time progress streaming.

    This endpoint directly executes the generation pipeline and streams
    progress updates via Server-Sent Events (SSE).

    The stream will emit:
    - `progress` events with status updates during generation
    - `completed` event with the generated idea on success
    - `failed` event with error details on failure
    """,
    responses={
        200: {
            "description": "SSE stream of generation progress",
            "content": {"text/event-stream": {}},
        },
    },
)
async def generate_idea_stream(
    request: GenerateIdeaRequest = GenerateIdeaRequest(),
) -> StreamingResponse:
    """Generate idea with direct SSE streaming."""

    # Status mapping
    status_map = {
        GenerationStatus.QUEUED: GenerationProgressStatus.QUEUED,
        GenerationStatus.GENERATING_CONCEPT: GenerationProgressStatus.GENERATING_CONCEPT,
        GenerationStatus.EXPANDING_PRD: GenerationProgressStatus.EXPANDING_PRD,
        GenerationStatus.CATEGORIZING: GenerationProgressStatus.CATEGORIZING,
        GenerationStatus.SAVING: GenerationProgressStatus.SAVING,
        GenerationStatus.COMPLETED: GenerationProgressStatus.COMPLETED,
        GenerationStatus.FAILED: GenerationProgressStatus.FAILED,
    }

    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate SSE events from the idea generation pipeline."""
        run_id = str(uuid.uuid4())[:8]

        try:
            async with asyncio.timeout(SSE_TIMEOUT_SECONDS):
                # Get available taxonomies from database
                async with get_async_session() as session:
                    repo = IdeaCoreRepository(session)
                    available_functions = await repo.get_all_function_slugs()
                    available_industries = await repo.get_all_industry_slugs()
                    available_target_users = await repo.get_all_target_user_slugs()
                    available_categories = await repo.get_all_category_slugs()

                # Fallback defaults
                if not available_functions:
                    available_functions = ["create", "automate", "analyze", "connect"]
                if not available_industries:
                    available_industries = ["technology", "healthcare", "finance", "education"]
                if not available_target_users:
                    available_target_users = ["developers", "businesses", "consumers"]
                if not available_categories:
                    available_categories = ["saas", "ai", "productivity"]

                # Stream progress from the pipeline
                async for progress in generate_single_idea_stream(
                    run_id=run_id,
                    idea_index=0,
                    available_functions=available_functions,
                    available_industries=available_industries,
                    available_target_users=available_target_users,
                    available_categories=available_categories,
                    function_slug=request.function_slug,
                    industry_slug=request.industry_slug,
                    idea_seed=request.idea_seed,
                    user_id=None,  # TODO: Extract from auth
                ):
                    progress_status = status_map.get(
                        progress["status"], GenerationProgressStatus.QUEUED
                    )

                    # Calculate progress percent
                    total_steps = progress.get("total_steps", 4)
                    current_step = progress.get("current_step", 0)
                    progress_percent = (
                        int((current_step / total_steps) * 100)
                        if total_steps > 0
                        else 0
                    )

                    # Determine event type
                    if progress["status"] == GenerationStatus.COMPLETED:
                        event_type = "completed"
                    elif progress["status"] == GenerationStatus.FAILED:
                        event_type = "failed"
                    else:
                        event_type = "progress"

                    event = SSEProgressEvent(
                        event=event_type,
                        status=progress_status,
                        message=progress.get("message", "Processing..."),
                        progress_percent=progress_percent,
                        idea_id=progress.get("idea_id"),
                        idea_slug=progress.get("idea_slug"),
                        error=progress.get("error"),
                    )

                    yield f"event: {event_type}\ndata: {event.model_dump_json()}\n\n"

                    # Stop streaming on terminal states
                    if event_type in ("completed", "failed"):
                        break

        except asyncio.TimeoutError:
            logger.error(f"[{run_id}] Generation timed out after {SSE_TIMEOUT_SECONDS}s")
            event = SSEProgressEvent(
                event="failed",
                status=GenerationProgressStatus.FAILED,
                message="Generation timed out. Please try again.",
                progress_percent=0,
                error="timeout",
            )
            yield f"event: failed\ndata: {event.model_dump_json()}\n\n"

        except Exception as e:
            logger.error(f"[{run_id}] Generation stream error: {e}", exc_info=True)
            event = SSEProgressEvent(
                event="failed",
                status=GenerationProgressStatus.FAILED,
                message="An error occurred during idea generation. Please try again.",
                progress_percent=0,
                error="generation_failed",
            )
            yield f"event: failed\ndata: {event.model_dump_json()}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/ideas/{slug}/fork/stream",
    summary="Fork idea with real-time SSE streaming",
    description="""
    Create a variation of an existing idea with real-time progress streaming.

    The forked idea will be generated based on the original, with any
    specified modifications applied (new focus, target audience, industry, etc.).

    The stream will emit:
    - `progress` events with status updates during generation
    - `completed` event with the forked idea on success
    - `failed` event with error details on failure
    """,
    responses={
        200: {
            "description": "SSE stream of fork progress",
            "content": {"text/event-stream": {}},
        },
        404: {
            "description": "Original idea not found",
        },
    },
)
async def fork_idea_stream_endpoint(
    slug: str,
    request: ForkIdeaRequest = ForkIdeaRequest(),
) -> StreamingResponse:
    """Fork an existing idea with SSE streaming."""

    # Status mapping
    status_map = {
        GenerationStatus.QUEUED: GenerationProgressStatus.QUEUED,
        GenerationStatus.GENERATING_CONCEPT: GenerationProgressStatus.GENERATING_CONCEPT,
        GenerationStatus.EXPANDING_PRD: GenerationProgressStatus.EXPANDING_PRD,
        GenerationStatus.CATEGORIZING: GenerationProgressStatus.CATEGORIZING,
        GenerationStatus.SAVING: GenerationProgressStatus.SAVING,
        GenerationStatus.COMPLETED: GenerationProgressStatus.COMPLETED,
        GenerationStatus.FAILED: GenerationProgressStatus.FAILED,
    }

    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate SSE events from the fork pipeline."""
        run_id = str(uuid.uuid4())[:8]

        try:
            async with asyncio.timeout(SSE_TIMEOUT_SECONDS):
                # Get available taxonomies from database
                async with get_async_session() as session:
                    repo = IdeaCoreRepository(session)
                    available_functions = await repo.get_all_function_slugs()
                    available_industries = await repo.get_all_industry_slugs()
                    available_target_users = await repo.get_all_target_user_slugs()
                    available_categories = await repo.get_all_category_slugs()

                # Fallback defaults
                if not available_functions:
                    available_functions = ["create", "automate", "analyze", "connect"]
                if not available_industries:
                    available_industries = ["technology", "healthcare", "finance", "education"]
                if not available_target_users:
                    available_target_users = ["developers", "businesses", "consumers"]
                if not available_categories:
                    available_categories = ["saas", "ai", "productivity"]

                # Build modifications dict from request
                modifications = {}
                if request.focus:
                    modifications["focus"] = request.focus
                if request.target_audience:
                    modifications["target_audience"] = request.target_audience
                if request.industry:
                    modifications["industry"] = request.industry
                if request.additional_notes:
                    modifications["additional_notes"] = request.additional_notes

                # Stream progress from the fork pipeline
                async for progress in fork_idea_stream(
                    run_id=run_id,
                    forked_from_slug=slug,
                    available_functions=available_functions,
                    available_industries=available_industries,
                    available_target_users=available_target_users,
                    available_categories=available_categories,
                    user_id=None,  # TODO: Extract from auth
                    modifications=modifications if modifications else None,
                ):
                    progress_status = status_map.get(
                        progress["status"], GenerationProgressStatus.QUEUED
                    )

                    # Calculate progress percent
                    total_steps = progress.get("total_steps", 4)
                    current_step = progress.get("current_step", 0)
                    progress_percent = (
                        int((current_step / total_steps) * 100)
                        if total_steps > 0
                        else 0
                    )

                    # Determine event type
                    if progress["status"] == GenerationStatus.COMPLETED:
                        event_type = "completed"
                    elif progress["status"] == GenerationStatus.FAILED:
                        event_type = "failed"
                    else:
                        event_type = "progress"

                    event = SSEProgressEvent(
                        event=event_type,
                        status=progress_status,
                        message=progress.get("message", "Processing..."),
                        progress_percent=progress_percent,
                        idea_id=progress.get("idea_id"),
                        idea_slug=progress.get("idea_slug"),
                        error=progress.get("error"),
                    )

                    yield f"event: {event_type}\ndata: {event.model_dump_json()}\n\n"

                    # Stop streaming on terminal states
                    if event_type in ("completed", "failed"):
                        break

        except asyncio.TimeoutError:
            logger.error(f"[{run_id}] Fork timed out after {SSE_TIMEOUT_SECONDS}s")
            event = SSEProgressEvent(
                event="failed",
                status=GenerationProgressStatus.FAILED,
                message="Fork generation timed out. Please try again.",
                progress_percent=0,
                error="timeout",
            )
            yield f"event: failed\ndata: {event.model_dump_json()}\n\n"

        except Exception as e:
            logger.error(f"[{run_id}] Fork stream error: {e}", exc_info=True)
            event = SSEProgressEvent(
                event="failed",
                status=GenerationProgressStatus.FAILED,
                message="An error occurred during fork generation. Please try again.",
                progress_percent=0,
                error="fork_failed",
            )
            yield f"event: failed\ndata: {event.model_dump_json()}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
