"""
FastAPI dependencies for authentication and authorization.

Provides reusable dependencies for extracting and validating the current user
from JWT tokens in request headers.
"""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.core.exceptions import ForbiddenError, UnauthorizedError
from src.core.security import decode_access_token
from src.users.models import User

logger = logging.getLogger(__name__)

# Constants for header parsing
_BEARER_PREFIX = "Bearer "
_BEARER_PREFIX_LEN = len(_BEARER_PREFIX)


def _extract_bearer_token(authorization: str | None) -> str | None:
    """Extract bearer token from Authorization header.

    Args:
        authorization: The Authorization header value.

    Returns:
        The token string if valid bearer format, None otherwise.
    """
    if not authorization:
        return None
    if not authorization.startswith(_BEARER_PREFIX):
        return None
    return authorization[_BEARER_PREFIX_LEN:]


def _parse_user_id(subject: str) -> UUID | None:
    """Parse user ID from token subject claim.

    Args:
        subject: The 'sub' claim from JWT payload.

    Returns:
        UUID if valid, None otherwise.
    """
    try:
        return UUID(subject)
    except (ValueError, TypeError):
        logger.debug("Invalid user ID format in token: %s", subject)
        return None


async def get_current_user_optional(
    session: Annotated[AsyncSession, Depends(get_session)],
    authorization: str | None = Header(
        default=None,
        description="Bearer token for authentication",
    ),
) -> User | None:
    """Get current user from JWT token (optional).

    Use this dependency when authentication is optional (e.g., public endpoints
    that show additional info for authenticated users).

    Args:
        session: Database session.
        authorization: Authorization header with Bearer token.

    Returns:
        User if authenticated and active, None otherwise.
    """
    token = _extract_bearer_token(authorization)
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        logger.debug("Invalid or expired token")
        return None

    subject = payload.get("sub")
    if not subject:
        logger.debug("Token missing 'sub' claim")
        return None

    user_id = _parse_user_id(subject)
    if not user_id:
        return None

    result = await session.execute(
        select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()

    if user:
        logger.debug("Authenticated user: %s", user.email)
    else:
        logger.debug("User not found or inactive: %s", user_id)

    return user


async def get_current_user(
    user: Annotated[User | None, Depends(get_current_user_optional)],
) -> User:
    """Get current user (required - raises 401 if not authenticated).

    Use this dependency when authentication is required.

    Args:
        user: User from optional dependency.

    Returns:
        Authenticated user.

    Raises:
        UnauthorizedError: If not authenticated.
    """
    if not user:
        raise UnauthorizedError("Authentication required")
    return user


async def get_current_verified_user(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Get current verified user (raises 403 if not verified).

    Use this dependency when email verification is required.

    Args:
        user: Authenticated user.

    Returns:
        Verified user.

    Raises:
        ForbiddenError: If user is not verified.
    """
    if not user.is_verified:
        raise ForbiddenError("Email verification required")
    return user


# Type aliases for cleaner route signatures
CurrentUserOptional = Annotated[User | None, Depends(get_current_user_optional)]
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentVerifiedUser = Annotated[User, Depends(get_current_verified_user)]
