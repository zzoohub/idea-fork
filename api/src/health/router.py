"""
Health check API router.

Provides endpoints for monitoring application health.
"""

from datetime import datetime

from fastapi import APIRouter

from src.health.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Check if the API server is running and healthy.",
)
async def health_check() -> HealthResponse:
    """Health check endpoint for monitoring."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat() + "Z",
        version="0.1.0",
    )
