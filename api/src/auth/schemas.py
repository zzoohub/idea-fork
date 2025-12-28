"""
Authentication Pydantic schemas for API requests and responses.

Defines request/response models for Google OAuth authentication flow.
"""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from src.users.models import SubscriptionTier


class GoogleAuthRequest(BaseModel):
    """Request body for Google OAuth login with Authorization Code Flow.

    The frontend obtains an authorization code from Google and sends it
    along with the redirect URI used in the authorization request.
    """

    code: str = Field(
        ...,
        min_length=1,
        description="Google authorization code from frontend",
    )
    redirect_uri: str = Field(
        ...,
        min_length=1,
        description="Redirect URI used in the authorization request",
    )

    @field_validator("code")
    @classmethod
    def validate_code_not_empty(cls, v: str) -> str:
        """Ensure authorization code is not just whitespace."""
        if not v.strip():
            raise ValueError("Authorization code cannot be empty")
        return v.strip()

    @field_validator("redirect_uri")
    @classmethod
    def validate_redirect_uri(cls, v: str) -> str:
        """Validate redirect URI format."""
        if not v.startswith(("http://", "https://")):
            raise ValueError("Redirect URI must be a valid HTTP(S) URL")
        return v


class TokenResponse(BaseModel):
    """JWT token response following OAuth 2.0 conventions."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = Field(..., gt=0, description="Token expiration time in seconds")


class UserResponse(BaseModel):
    """User profile response with account information."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="User unique identifier (UUID)")
    email: EmailStr = Field(..., description="User email address")
    name: str | None = Field(default=None, description="User display name")
    avatar_url: str | None = Field(
        default=None, description="URL to user's avatar image"
    )
    subscription_tier: SubscriptionTier = Field(
        ..., description="User subscription tier (free, pro, enterprise)"
    )
    generation_credits: int = Field(
        ..., ge=0, description="Remaining idea generation credits"
    )
    is_verified: bool = Field(..., description="Whether email is verified")


class AuthResponse(BaseModel):
    """Combined auth response with token and user profile.

    Returned after successful authentication via Google OAuth.
    """

    token: TokenResponse = Field(..., description="JWT access token details")
    user: UserResponse = Field(..., description="Authenticated user profile")
