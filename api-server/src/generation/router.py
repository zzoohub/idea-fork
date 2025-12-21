"""
Generation API router for on-demand idea generation.

Provides endpoints for:
- POST /api/ideas/generate - Request new idea generation
- POST /api/ideas/{slug}/fork - Fork existing idea
- GET /api/requests/{request_id} - Get generation request status
- GET /api/requests/{request_id}/stream - SSE for real-time progress
"""

import asyncio
import json
import logging
from typing import AsyncGenerator
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from src.core.config import settings
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


@router.post(
    "/ideas/generate",
    response_model=GenerationRequestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request new idea generation",
    description="""
    Initiate generation of a new AI-powered product idea.

    This endpoint queues a background job to generate the idea and returns
    immediately with a request ID that can be used to track progress.

    Use GET /api/requests/{request_id} to check status, or
    GET /api/requests/{request_id}/stream for real-time updates via SSE.
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
        gen_request = await service.create_generation_request(user_id=None)

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
            "content": {"application/json": {"example": {"detail": "Request not found"}}},
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
                        message=status_response.progress_message or "Generation completed",
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
                        status=status_response.progress or GenerationProgressStatus.QUEUED,
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
