"""
Generation API router for on-demand idea generation.

Provides endpoints for:
- POST /api/ideas/generate/stream - Direct SSE streaming generation (user-triggered)
- POST /api/ideas/generate - Queue-based generation (legacy/cronjob)
- POST /api/ideas/{slug}/fork - Fork existing idea
- GET /api/requests/{request_id} - Get generation request status
- GET /api/requests/{request_id}/stream - SSE for real-time progress (queue-based)
"""

import asyncio
import logging
import uuid
from typing import AsyncGenerator
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

# Import from idea-generator (configured in main.py lifespan)
# Import from idea-generator (configured in main.py lifespan)
from idea_generator import (
    GenerationStatus,
    IdeaCoreRepository,
    generate_single_idea_stream,
    get_async_session,
)

from src.core.database import DbSession
from src.core.exceptions import NotFoundError
from src.generation.schemas import (
    ForkIdeaRequest,
    GenerateIdeaRequest,
    GenerationProgressStatus,
    GenerationRequestResponse,
    GenerationStatusResponse,
    RequestStatus,
    SSEProgressEvent,
)
from src.generation.service import GenerationService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Generation"])

# SSE generation timeout (5 minutes)
SSE_TIMEOUT_SECONDS = 300


@router.post(
    "/ideas/generate/stream",
    summary="Generate idea with real-time SSE streaming",
    description="""
    Generate a new AI-powered product idea with real-time progress streaming.

    This endpoint directly executes the generation pipeline and streams
    progress updates via Server-Sent Events (SSE). Use this for user-triggered
    generation that requires immediate feedback.

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
    """Generate idea with direct SSE streaming (no queue)."""

    # Status mapping (defined once, reused in generator)
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
            # Apply timeout to entire generation process
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
                    available_industries = [
                        "technology",
                        "healthcare",
                        "finance",
                        "education",
                    ]
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

                    # Calculate progress percent from actual step/total
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
            logger.error(
                f"[{run_id}] Generation timed out after {SSE_TIMEOUT_SECONDS}s"
            )
            event = SSEProgressEvent(
                event="failed",
                status=GenerationProgressStatus.FAILED,
                message="Generation timed out. Please try again.",
                progress_percent=0,
                error="timeout",
            )
            yield f"event: failed\ndata: {event.model_dump_json()}\n\n"

        except Exception as e:
            # Log full error internally, send sanitized message to client
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
    "/ideas/generate",
    response_model=GenerationRequestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue idea generation (for background processing)",
    description="""
    Queue a new idea generation request for background processing.

    This endpoint queues a background job and returns immediately with a
    request ID. Use this for batch processing or when SSE is not available.

    For real-time generation with progress updates, use POST /ideas/generate/stream instead.
    """,
)
async def generate_idea(
    session: DbSession,
    request: GenerateIdeaRequest = GenerateIdeaRequest(),
) -> GenerationRequestResponse:
    """Queue a new idea generation request."""
    service = GenerationService(session)

    try:
        # TODO: Extract user_id from auth token when auth is implemented
        gen_request = await service.create_generation_request(
            user_id=None,
            function_slug=request.function_slug,
            industry_slug=request.industry_slug,
            idea_seed=request.idea_seed,
        )

        return GenerationRequestResponse(
            request_id=gen_request.id,
            status=RequestStatus.QUEUED,
            message="Idea generation queued successfully",
        )
    except Exception as e:
        logger.error(f"Failed to create generation request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue idea generation",
        )


@router.post(
    "/ideas/{slug}/fork",
    response_model=GenerationRequestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Fork an existing idea",
    description="""
    Create a variation of an existing idea with optional modifications.

    The forked idea will be generated based on the original, with any
    specified modifications applied (new focus, target audience, industry, etc.).

    Returns a request ID for tracking the generation progress.
    """,
)
async def fork_idea(
    session: DbSession,
    slug: str,
    request: ForkIdeaRequest = ForkIdeaRequest(),
) -> GenerationRequestResponse:
    """Queue a fork request for an existing idea."""
    service = GenerationService(session)

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

    try:
        gen_request = await service.create_fork_request(
            fork_from_slug=slug,
            modifications=modifications if modifications else None,
            user_id=None,  # TODO: Extract from auth
        )

        return GenerationRequestResponse(
            request_id=gen_request.id,
            status=RequestStatus.QUEUED,
            message=f"Fork of '{slug}' queued successfully",
        )
    except ValueError as e:
        # Idea not found
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to create fork request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue fork request",
        )


@router.get(
    "/requests/{request_id}",
    response_model=GenerationStatusResponse,
    summary="Get generation request status",
    description="""
    Check the current status of a generation request.

    Returns detailed progress information including:
    - Current status (queued, processing, completed, failed)
    - Progress percentage
    - Current step being executed
    - Result (idea_id, idea_slug) on completion
    - Error message on failure
    """,
    responses={
        404: {
            "description": "Request not found",
            "content": {
                "application/json": {"example": {"detail": "Request not found"}}
            },
        }
    },
)
async def get_request_status(
    session: DbSession,
    request_id: UUID,
) -> GenerationStatusResponse:
    """Get the current status of a generation request."""
    service = GenerationService(session)

    status_response = await service.get_request_status(request_id)

    if not status_response:
        raise NotFoundError("Request")

    return status_response


@router.get(
    "/requests/{request_id}/stream",
    summary="Stream generation progress (SSE)",
    description="""
    Server-Sent Events endpoint for real-time generation progress updates.

    Streams progress events as the idea is being generated:
    - `progress` events with status updates
    - `completed` event with the generated idea
    - `failed` event if generation fails

    The stream closes automatically on completion or failure.
    """,
    responses={
        200: {
            "description": "SSE stream",
            "content": {"text/event-stream": {}},
        },
        404: {
            "description": "Request not found",
        },
    },
)
async def stream_request_progress(
    session: DbSession,
    request_id: UUID,
) -> StreamingResponse:
    """Stream real-time progress updates via Server-Sent Events."""

    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate SSE events for progress updates."""
        service = GenerationService(session)
        last_status = None
        poll_interval = 1.0  # seconds

        while True:
            status_response = await service.get_request_status(request_id)

            if not status_response:
                # Request not found
                event = SSEProgressEvent(
                    event="failed",
                    status=GenerationProgressStatus.FAILED,
                    message="Request not found",
                    progress_percent=0,
                    error="Request not found",
                )
                yield f"event: failed\ndata: {event.model_dump_json()}\n\n"
                break

            # Create progress event
            current_status = (
                status_response.progress.value if status_response.progress else "queued"
            )

            # Only send update if status changed
            if current_status != last_status:
                last_status = current_status

                if status_response.status == RequestStatus.COMPLETED:
                    event = SSEProgressEvent(
                        event="completed",
                        status=GenerationProgressStatus.COMPLETED,
                        message=status_response.progress_message
                        or "Generation completed",
                        progress_percent=100,
                        idea_id=status_response.idea_id,
                        idea_slug=status_response.idea_slug,
                    )
                    yield f"event: completed\ndata: {event.model_dump_json()}\n\n"
                    break

                elif status_response.status == RequestStatus.FAILED:
                    event = SSEProgressEvent(
                        event="failed",
                        status=GenerationProgressStatus.FAILED,
                        message=status_response.progress_message or "Generation failed",
                        progress_percent=0,
                        error=status_response.error,
                    )
                    yield f"event: failed\ndata: {event.model_dump_json()}\n\n"
                    break

                else:
                    # Progress update
                    event = SSEProgressEvent(
                        event="progress",
                        status=status_response.progress
                        or GenerationProgressStatus.QUEUED,
                        message=status_response.progress_message or "Processing...",
                        progress_percent=status_response.progress_percent or 0,
                    )
                    yield f"event: progress\ndata: {event.model_dump_json()}\n\n"

            await asyncio.sleep(poll_interval)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
