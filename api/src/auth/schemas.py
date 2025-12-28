"""
Authentication Pydantic schemas for API requests and responses.

Defines request/response models for Google OAuth authentication flow.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase for API responses."""
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


# Shared config for camelCase serialization
_CAMEL_CASE_CONFIG = ConfigDict(
    populate_by_name=True,
    alias_generator=to_camel,
)


class GoogleAuthRequest(BaseModel):
    """Request body for Google OAuth login with Authorization Code Flow.

    The frontend obtains an authorization code from Google and sends it
    along with the redirect URI used in the authorization request.
    """

    model_config = _CAMEL_CASE_CONFIG

    code: str = Field(
        ...,
        min_length=1,
        description="Google authorization code from frontend",
    )
    redirect_uri: str = Field(
        ...,
        alias="redirectUri",
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

    model_config = _CAMEL_CASE_CONFIG

    access_token: str = Field(..., alias="accessToken")
    token_type: Literal["bearer"] = Field(default="bearer", alias="tokenType")
    expires_in: int = Field(
        ...,
        alias="expiresIn",
        gt=0,
        description="Token expiration time in seconds",
    )


class UserResponse(BaseModel):
    """User profile response with account information."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: str = Field(..., description="User unique identifier (UUID)")
    email: EmailStr = Field(..., description="User email address")
    name: str | None = Field(default=None, description="User display name")
    avatar_url: str | None = Field(
        default=None,
        alias="avatarUrl",
        description="URL to user's avatar image",
    )
    subscription_tier: str = Field(
        ...,
        alias="subscriptionTier",
        description="User subscription tier (free, pro, enterprise)",
    )
    generation_credits: int = Field(
        ...,
        alias="generationCredits",
        ge=0,
        description="Remaining idea generation credits",
    )
    is_verified: bool = Field(
        ...,
        alias="isVerified",
        description="Whether email is verified",
    )


class AuthResponse(BaseModel):
    """Combined auth response with token and user profile.

    Returned after successful authentication via Google OAuth.
    """

    model_config = _CAMEL_CASE_CONFIG

    token: TokenResponse = Field(..., description="JWT access token details")
    user: UserResponse = Field(..., description="Authenticated user profile")
