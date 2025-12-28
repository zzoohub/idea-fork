"""
Authentication API router.

Provides endpoints for Google OAuth authentication and user profile access.
"""

import logging

from fastapi import APIRouter, status

from src.auth.schemas import AuthResponse, GoogleAuthRequest, UserResponse
from src.auth.service import AuthService
from src.core.database import DbSession
from src.core.deps import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/google",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Google OAuth login",
    description="""
    Authenticate with Google OAuth using the Authorization Code Flow.

    **Flow:**
    1. Frontend redirects user to Google OAuth consent screen
    2. User approves and is redirected back with an authorization code
    3. Frontend sends the code to this endpoint
    4. Backend exchanges code for tokens and creates/updates user
    5. Returns JWT access token and user profile

    **Request:**
    - `code`: The authorization code from Google OAuth redirect
    - `redirectUri`: The same redirect URI used in the authorization request

    **Response:**
    - `token`: JWT access token details (use in Authorization header)
    - `user`: Authenticated user profile
    """,
    responses={
        200: {
            "description": "Successfully authenticated",
            "model": AuthResponse,
        },
        400: {
            "description": "OAuth not configured or invalid request",
        },
        401: {
            "description": "Invalid authorization code or authentication failed",
        },
        422: {
            "description": "Validation error in request body",
        },
    },
)
async def google_login(
    session: DbSession,
    request: GoogleAuthRequest,
) -> AuthResponse:
    """Authenticate user with Google OAuth using Authorization Code Flow."""
    service = AuthService(session)
    return await service.google_login(request.code, request.redirect_uri)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user",
    description="""
    Get the authenticated user's profile.

    Requires a valid JWT access token in the Authorization header:
    `Authorization: Bearer <token>`

    Returns the user's profile including:
    - Account information (id, email, name)
    - Subscription tier and remaining credits
    - Verification status
    """,
    responses={
        200: {
            "description": "User profile retrieved successfully",
            "model": UserResponse,
        },
        401: {
            "description": "Not authenticated or invalid token",
        },
    },
)
async def get_me(current_user: CurrentUser) -> UserResponse:
    """Get current authenticated user profile."""
    logger.debug("User profile requested: %s", current_user.email)
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        subscription_tier=current_user.subscription_tier.value,
        generation_credits=current_user.generation_credits,
        is_verified=current_user.is_verified,
    )
