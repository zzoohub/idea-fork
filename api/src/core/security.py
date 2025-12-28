"""
JWT token creation and verification utilities.

Provides secure JWT handling for authentication with proper error handling
and structured logging.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, TypedDict

import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from src.core.config import settings

logger = logging.getLogger(__name__)


class TokenPayload(TypedDict, total=False):
    """JWT token payload structure."""

    sub: str  # Subject (user ID)
    exp: datetime  # Expiration time
    iat: datetime  # Issued at time


class TokenError(Exception):
    """Base exception for token-related errors."""

    pass


class TokenExpiredError(TokenError):
    """Raised when token has expired."""

    pass


class TokenInvalidError(TokenError):
    """Raised when token is invalid or malformed."""

    pass


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token.

    Args:
        data: Payload data to encode in the token. Must include 'sub' claim.
        expires_delta: Optional custom expiration time. Defaults to settings.

    Returns:
        Encoded JWT token string.

    Raises:
        ValueError: If 'sub' claim is missing from data.
    """
    if "sub" not in data:
        raise ValueError("Token data must include 'sub' claim")

    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )

    to_encode.update({
        "exp": expire,
        "iat": now,
    })

    token = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    logger.debug(
        "Created access token for subject: %s, expires: %s",
        data.get("sub"),
        expire.isoformat(),
    )

    return token


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and verify a JWT token.

    Args:
        token: The JWT token string to decode.

    Returns:
        Decoded payload dict if valid, None if invalid or expired.

    Note:
        This function returns None on any token error for security.
        Use verify_access_token() if you need specific error information.
    """
    try:
        return verify_access_token(token)
    except TokenError:
        return None


def verify_access_token(token: str) -> dict[str, Any]:
    """Verify and decode a JWT token with detailed error handling.

    Args:
        token: The JWT token string to verify.

    Returns:
        Decoded payload dict.

    Raises:
        TokenExpiredError: If the token has expired.
        TokenInvalidError: If the token is invalid or malformed.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        logger.debug("Token verified for subject: %s", payload.get("sub"))
        return payload
    except ExpiredSignatureError as e:
        logger.debug("Token expired: %s", str(e))
        raise TokenExpiredError("Token has expired") from e
    except InvalidTokenError as e:
        logger.warning("Invalid token: %s", str(e))
        raise TokenInvalidError("Token is invalid") from e
