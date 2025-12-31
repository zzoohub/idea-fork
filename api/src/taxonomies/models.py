"""
Taxonomy models for classifying ideas along three dimensions.

- FunctionType: What the product does (create, automate, analyze, etc.)
- IndustryType: Which industry/domain it targets
- TargetUserType: Who the primary users are
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime
from sqlmodel import Column, Field, SQLModel


def _utc_now() -> datetime:
    """Get current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


class FunctionType(SQLModel, table=True):
    """Function type representing what the product does."""

    __tablename__ = "function_types"  # type: ignore

    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True)
    name: str = Field(index=True)
    description: str = Field(default="")  # Used in AI prompts
    icon: Optional[str] = Field(default=None)
    display_order: int = Field(default=0)

    # Soft delete support
    is_active: bool = Field(default=True, index=True)
    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    created_at: datetime = Field(
        default_factory=_utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=_utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class IndustryType(SQLModel, table=True):
    """Industry type representing the target industry."""

    __tablename__ = "industry_types"  # type: ignore

    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True)
    name: str = Field(index=True)
    description: str = Field(default="")

    # Soft delete support
    is_active: bool = Field(default=True, index=True)
    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    created_at: datetime = Field(
        default_factory=_utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=_utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class TargetUserType(SQLModel, table=True):
    """Target user type representing the primary audience."""

    __tablename__ = "target_user_types"  # type: ignore

    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True)
    name: str = Field(index=True)
    description: str = Field(default="")

    # Soft delete support
    is_active: bool = Field(default=True, index=True)
    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    created_at: datetime = Field(
        default_factory=_utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=_utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


# Seed data for initial population
FUNCTION_TYPES_SEED = [
    {
        "slug": "create",
        "name": "Create",
        "description": "Tools for content or product generation",
        "display_order": 1,
    },
    {
        "slug": "automate",
        "name": "Automate",
        "description": "Tools for automating repetitive tasks",
        "display_order": 2,
    },
    {
        "slug": "analyze",
        "name": "Analyze",
        "description": "Tools for data analysis and insights",
        "display_order": 3,
    },
    {
        "slug": "connect",
        "name": "Connect",
        "description": "Tools for communication and networking",
        "display_order": 4,
    },
    {
        "slug": "sell",
        "name": "Sell",
        "description": "Tools for sales and monetization",
        "display_order": 5,
    },
    {
        "slug": "learn",
        "name": "Learn",
        "description": "Tools for education and skill improvement",
        "display_order": 6,
    },
    {
        "slug": "manage",
        "name": "Manage",
        "description": "Tools for management and organization",
        "display_order": 7,
    },
    {
        "slug": "protect",
        "name": "Protect",
        "description": "Tools for security, backup, and privacy",
        "display_order": 8,
    },
]

INDUSTRY_TYPES_SEED = [
    {
        "slug": "healthcare",
        "name": "Healthcare",
        "description": "Medical, fitness, mental health",
    },
    {
        "slug": "finance",
        "name": "Finance",
        "description": "Banking, payments, personal finance",
    },
    {
        "slug": "education",
        "name": "Education",
        "description": "Learning, training, academic",
    },
    {
        "slug": "e-commerce",
        "name": "E-commerce",
        "description": "Online retail, marketplaces",
    },
    {
        "slug": "entertainment",
        "name": "Entertainment",
        "description": "Media, gaming, streaming",
    },
    {
        "slug": "technology",
        "name": "Technology",
        "description": "Software, hardware, IT services",
    },
    {
        "slug": "retail",
        "name": "Retail",
        "description": "Physical stores, consumer goods",
    },
    {
        "slug": "real-estate",
        "name": "Real Estate",
        "description": "Property, housing, rentals",
    },
    {
        "slug": "travel",
        "name": "Travel",
        "description": "Tourism, hospitality, transportation",
    },
    {
        "slug": "food",
        "name": "Food & Beverage",
        "description": "Restaurants, delivery, F&B",
    },
    {
        "slug": "manufacturing",
        "name": "Manufacturing",
        "description": "Production, logistics, supply chain",
    },
    {"slug": "legal", "name": "Legal", "description": "Law, compliance, contracts"},
    {
        "slug": "marketing",
        "name": "Marketing",
        "description": "Advertising, PR, brand management",
    },
    {"slug": "media", "name": "Media", "description": "News, publishing, content"},
]

TARGET_USER_TYPES_SEED = [
    {
        "slug": "developers",
        "name": "Developers",
        "description": "Software engineers, programmers",
    },
    {
        "slug": "creators",
        "name": "Creators",
        "description": "Content creators, YouTubers, artists",
    },
    {
        "slug": "marketers",
        "name": "Marketers",
        "description": "Marketing professionals, growth hackers",
    },
    {
        "slug": "businesses",
        "name": "Businesses",
        "description": "SMBs, business owners",
    },
    {
        "slug": "consumers",
        "name": "Consumers",
        "description": "General public, end users",
    },
    {"slug": "students", "name": "Students", "description": "Learners, academics"},
    {
        "slug": "professionals",
        "name": "Professionals",
        "description": "White-collar workers, experts",
    },
    {
        "slug": "enterprises",
        "name": "Enterprises",
        "description": "Large corporations, organizations",
    },
    {
        "slug": "freelancers",
        "name": "Freelancers",
        "description": "Independent workers, contractors",
    },
    {
        "slug": "startups",
        "name": "Startups",
        "description": "Early-stage companies, founders",
    },
]
