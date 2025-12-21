"""
User SQLModel for the users table.

Users can request idea generation and have subscription tiers.
"""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Column, Field, SQLModel

if TYPE_CHECKING:
    from src.generation.models import GenerationRequest


class SubscriptionTier(str, Enum):
    """User subscription tiers with different generation limits."""

    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class User(SQLModel, table=True):
    """User model for authentication and idea generation tracking."""

    __tablename__ = "users"

    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True),
    )
    email: str = Field(unique=True, index=True)
    hashed_password: str

    # Subscription and credits
    subscription_tier: SubscriptionTier = Field(default=SubscriptionTier.FREE)
    generation_credits: int = Field(default=5, ge=0)

    # Account status
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def can_generate(self) -> bool:
        """Check if user has credits to generate ideas."""
        if self.subscription_tier == SubscriptionTier.ENTERPRISE:
            return True  # Unlimited for enterprise
        return self.generation_credits > 0

    def get_credits_per_month(self) -> int:
        """Get monthly credit allocation based on tier."""
        tier_credits = {
            SubscriptionTier.FREE: 5,
            SubscriptionTier.PRO: 50,
            SubscriptionTier.ENTERPRISE: -1,  # Unlimited
        }
        return tier_credits.get(self.subscription_tier, 5)
