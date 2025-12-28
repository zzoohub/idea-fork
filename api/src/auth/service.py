"""
Authentication service for Google OAuth with Authorization Code Flow.

Handles the OAuth flow, user creation/lookup, and JWT token generation.
"""

import logging
from dataclasses import dataclass
from typing import TypedDict

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.schemas import AuthResponse, TokenResponse, UserResponse
from src.core.config import settings
from src.core.exceptions import BadRequestError, UnauthorizedError
from src.core.security import create_access_token
from src.users.models import User

logger = logging.getLogger(__name__)

# Google OAuth endpoints
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

# HTTP client timeout settings
_HTTP_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


class GoogleUserInfo(TypedDict):
    """Structured Google user information."""

    google_id: str
    email: str
    name: str | None
    picture: str | None
    email_verified: bool


class GoogleTokens(TypedDict):
    """Google OAuth token response structure."""

    access_token: str
    token_type: str
    expires_in: int
    id_token: str | None
    scope: str


@dataclass
class AuthResult:
    """Internal result of authentication operation."""

    user: User
    is_new_user: bool


class AuthService:
    """Service for authentication business logic.

    Handles Google OAuth authentication flow:
    1. Exchange authorization code for tokens
    2. Fetch user info from Google
    3. Find or create local user
    4. Generate JWT access token
    """

    def __init__(self, session: AsyncSession) -> None:
        """Initialize auth service.

        Args:
            session: Async database session.
        """
        self._session = session

    async def google_login(self, code: str, redirect_uri: str) -> AuthResponse:
        """Authenticate user with Google Authorization Code Flow.

        Args:
            code: Authorization code from Google OAuth redirect.
            redirect_uri: The redirect URI used in the authorization request.

        Returns:
            AuthResponse with JWT token and user profile.

        Raises:
            BadRequestError: If OAuth is not configured.
            UnauthorizedError: If authentication fails.
        """
        # Validate OAuth configuration
        if not settings.is_oauth_configured:
            logger.error("Google OAuth not configured")
            raise BadRequestError("Authentication is not configured")

        logger.info("Processing Google OAuth login")

        # Step 1: Exchange code for tokens
        tokens = await self._exchange_code_for_tokens(code, redirect_uri)

        # Step 2: Get user info using access token
        google_user = await self._get_user_info(tokens["access_token"])
        logger.debug("Retrieved Google user info for: %s", google_user["email"])

        # Step 3: Find or create user
        auth_result = await self._find_or_create_user(google_user)

        if auth_result.is_new_user:
            logger.info("Created new user: %s", auth_result.user.email)
        else:
            logger.info("User logged in: %s", auth_result.user.email)

        # Step 4: Generate JWT
        access_token = create_access_token(data={"sub": str(auth_result.user.id)})

        return self._build_auth_response(auth_result.user, access_token)

    async def _exchange_code_for_tokens(
        self,
        code: str,
        redirect_uri: str,
    ) -> GoogleTokens:
        """Exchange authorization code for access token.

        Args:
            code: Authorization code from Google.
            redirect_uri: The redirect URI used in authorization.

        Returns:
            Token response from Google.

        Raises:
            UnauthorizedError: If token exchange fails.
        """
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            try:
                response = await client.post(
                    _GOOGLE_TOKEN_URL,
                    data={
                        "code": code,
                        "client_id": settings.google_client_id,
                        "client_secret": settings.google_client_secret,
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code",
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
            except httpx.RequestError as e:
                logger.error("Failed to connect to Google OAuth: %s", str(e))
                raise UnauthorizedError(
                    "Unable to connect to authentication service"
                ) from e

            if response.status_code != 200:
                error_data = response.json()
                error_description = error_data.get("error_description", "Unknown error")
                error_code = error_data.get("error", "unknown")
                logger.warning(
                    "Google token exchange failed: %s - %s",
                    error_code,
                    error_description,
                )
                raise UnauthorizedError(f"Authentication failed: {error_description}")

            return response.json()

    async def _get_user_info(self, access_token: str) -> GoogleUserInfo:
        """Get user info from Google using access token.

        Args:
            access_token: Google OAuth access token.

        Returns:
            Structured user information.

        Raises:
            UnauthorizedError: If fetching user info fails.
        """
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            try:
                response = await client.get(
                    _GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
            except httpx.RequestError as e:
                logger.error("Failed to fetch Google user info: %s", str(e))
                raise UnauthorizedError(
                    "Unable to retrieve user information"
                ) from e

            if response.status_code != 200:
                logger.warning(
                    "Failed to get user info from Google: %d",
                    response.status_code,
                )
                raise UnauthorizedError("Failed to get user information from Google")

            user_info = response.json()

            # Validate required fields
            if not user_info.get("sub") or not user_info.get("email"):
                logger.error("Google user info missing required fields")
                raise UnauthorizedError("Invalid user information from Google")

            return GoogleUserInfo(
                google_id=user_info["sub"],
                email=user_info["email"],
                name=user_info.get("name"),
                picture=user_info.get("picture"),
                email_verified=user_info.get("email_verified", False),
            )

    async def _find_or_create_user(self, google_user: GoogleUserInfo) -> AuthResult:
        """Find existing user or create new one.

        Lookup order:
        1. By Google ID (exact match)
        2. By email (link existing account)
        3. Create new user

        Args:
            google_user: User information from Google.

        Returns:
            AuthResult with user and whether they are new.
        """
        # Try to find by google_id first
        user = await self._find_user_by_google_id(google_user["google_id"])

        if user:
            # Update user info from Google
            await self._update_user_from_google(user, google_user)
            return AuthResult(user=user, is_new_user=False)

        # Try to find by email (link existing account)
        user = await self._find_user_by_email(google_user["email"])

        if user:
            # Link Google account to existing user
            user.google_id = google_user["google_id"]
            await self._update_user_from_google(user, google_user)
            logger.info(
                "Linked Google account to existing user: %s",
                google_user["email"],
            )
            return AuthResult(user=user, is_new_user=False)

        # Create new user
        user = await self._create_user(google_user)
        return AuthResult(user=user, is_new_user=True)

    async def _find_user_by_google_id(self, google_id: str) -> User | None:
        """Find user by Google ID."""
        result = await self._session.execute(
            select(User).where(User.google_id == google_id)
        )
        return result.scalar_one_or_none()

    async def _find_user_by_email(self, email: str) -> User | None:
        """Find user by email address."""
        result = await self._session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def _update_user_from_google(
        self,
        user: User,
        google_user: GoogleUserInfo,
    ) -> None:
        """Update user profile with latest Google info."""
        user.name = google_user["name"]
        user.avatar_url = google_user["picture"]
        user.is_verified = google_user["email_verified"]
        await self._session.commit()
        await self._session.refresh(user)

    async def _create_user(self, google_user: GoogleUserInfo) -> User:
        """Create new user from Google info."""
        user = User(
            email=google_user["email"],
            google_id=google_user["google_id"],
            name=google_user["name"],
            avatar_url=google_user["picture"],
            is_verified=google_user["email_verified"],
        )
        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        return user

    @staticmethod
    def _build_auth_response(user: User, access_token: str) -> AuthResponse:
        """Build authentication response from user and token."""
        return AuthResponse(
            token=TokenResponse(
                access_token=access_token,
                token_type="bearer",
                expires_in=settings.jwt_expire_seconds,
            ),
            user=UserResponse(
                id=str(user.id),
                email=user.email,
                name=user.name,
                avatar_url=user.avatar_url,
                subscription_tier=user.subscription_tier.value,
                generation_credits=user.generation_credits,
                is_verified=user.is_verified,
            ),
        )
