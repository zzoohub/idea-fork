"""
User SQLModel for the users table.

Users can authenticate via Google OAuth and have subscription tiers
that determine their idea generation limits.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, ClassVar
from uuid import UUID, uuid4

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Column, Field, SQLModel

if TYPE_CHECKING:
    from src.generation.models import GenerationRequest


def _utc_now() -> datetime:
    """Get current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


class SubscriptionTier(str, Enum):
    """User subscription tiers with different generation limits.

    Each tier has a monthly credit allocation:
    - FREE: 5 credits/month
    - PRO: 50 credits/month
    - ENTERPRISE: Unlimited
    """

    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


# Credit allocations by tier
_TIER_CREDITS: dict[SubscriptionTier, int] = {
    SubscriptionTier.FREE: 5,
    SubscriptionTier.PRO: 50,
    SubscriptionTier.ENTERPRISE: -1,  # -1 represents unlimited
}


class User(SQLModel, table=True):
    """User model for authentication and idea generation tracking.

    Supports both password-based and OAuth authentication.
    Currently, only Google OAuth is implemented.
    """

    __tablename__ = "users"  # type: ignore

    # Primary key
    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True),
        description="Unique user identifier",
    )

    # Authentication - email is required, password is optional for OAuth users
    email: str = Field(
        unique=True,
        index=True,
        max_length=255,
        description="User email address (unique)",
    )
    hashed_password: str | None = Field(
        default=None,
        max_length=255,
        description="Hashed password (null for OAuth-only users)",
    )

    # Google OAuth fields
    google_id: str | None = Field(
        default=None,
        unique=True,
        index=True,
        max_length=255,
        description="Google account ID for OAuth authentication",
    )
    name: str | None = Field(
        default=None,
        max_length=255,
        description="User display name",
    )
    avatar_url: str | None = Field(
        default=None,
        max_length=2048,
        description="URL to user's profile picture",
    )

    # Subscription and credits
    subscription_tier: SubscriptionTier = Field(
        default=SubscriptionTier.FREE,
        description="User subscription tier",
    )
    generation_credits: int = Field(
        default=5,
        ge=0,
        description="Remaining idea generation credits",
    )

    # Account status
    is_active: bool = Field(
        default=True,
        description="Whether the account is active",
    )
    is_verified: bool = Field(
        default=False,
        description="Whether email is verified",
    )

    # Timestamps (timezone-aware UTC)
    created_at: datetime = Field(
        default_factory=_utc_now,
        description="Account creation timestamp",
    )
    updated_at: datetime = Field(
        default_factory=_utc_now,
        description="Last update timestamp",
    )

    # Class-level constants
    UNLIMITED_CREDITS: ClassVar[int] = -1

    def can_generate(self) -> bool:
        """Check if user has credits to generate ideas.

        Returns:
            True if user can generate (has credits or is enterprise tier).
        """
        if self.subscription_tier == SubscriptionTier.ENTERPRISE:
            return True  # Unlimited for enterprise
        return self.generation_credits > 0

    def use_credit(self) -> bool:
        """Consume one generation credit if available.

        Returns:
            True if credit was consumed, False if no credits available.

        Note:
            Enterprise users never consume credits.
        """
        if self.subscription_tier == SubscriptionTier.ENTERPRISE:
            return True  # No credit consumed for enterprise

        if self.generation_credits <= 0:
            return False

        self.generation_credits -= 1
        self.updated_at = _utc_now()
        return True

    def get_credits_per_month(self) -> int:
        """Get monthly credit allocation based on tier.

        Returns:
            Monthly credit count, or -1 for unlimited (enterprise).
        """
        return _TIER_CREDITS.get(
            self.subscription_tier, _TIER_CREDITS[SubscriptionTier.FREE]
        )

    def reset_credits(self) -> None:
        """Reset credits to monthly allocation (for billing cycle)."""
        credits = self.get_credits_per_month()
        if credits != self.UNLIMITED_CREDITS:
            self.generation_credits = credits
            self.updated_at = _utc_now()

    @property
    def has_google_auth(self) -> bool:
        """Check if user has linked Google account."""
        return self.google_id is not None

    @property
    def has_password_auth(self) -> bool:
        """Check if user can authenticate with password."""
        return self.hashed_password is not None
