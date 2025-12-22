"""Initial schema with taxonomy system.

Revision ID: 001_initial
Revises:
Create Date: 2024-12-23

Tables:
- users: User accounts with subscription tiers
- categories: Legacy category system (many-to-many with ideas)
- ideas: AI-generated product ideas
- idea_categories: Junction table for ideas <-> categories
- generation_requests: RQ job tracking for idea generation
- function_types: Taxonomy - what the product does
- industry_types: Taxonomy - target industry
- target_user_types: Taxonomy - primary audience
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # === Users table ===
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("subscription_tier", sa.String(), nullable=False, server_default="free"),
        sa.Column("generation_credits", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # === Categories table (legacy) ===
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("color_variant", sa.String(), nullable=False, server_default="secondary"),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_categories_name", "categories", ["name"], unique=True)
    op.create_index("ix_categories_slug", "categories", ["slug"], unique=True)

    # === Taxonomy: Function Types ===
    op.create_table(
        "function_types",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("icon", sa.String(), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_function_types_slug", "function_types", ["slug"], unique=True)
    op.create_index("ix_function_types_name", "function_types", ["name"])
    op.create_index("ix_function_types_is_active", "function_types", ["is_active"])

    # === Taxonomy: Industry Types ===
    op.create_table(
        "industry_types",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_industry_types_slug", "industry_types", ["slug"], unique=True)
    op.create_index("ix_industry_types_name", "industry_types", ["name"])
    op.create_index("ix_industry_types_is_active", "industry_types", ["is_active"])

    # === Taxonomy: Target User Types ===
    op.create_table(
        "target_user_types",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_target_user_types_slug", "target_user_types", ["slug"], unique=True)
    op.create_index("ix_target_user_types_name", "target_user_types", ["name"])
    op.create_index("ix_target_user_types_is_active", "target_user_types", ["is_active"])

    # === Ideas table ===
    op.create_table(
        "ideas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("image_url", sa.String(), nullable=False),
        sa.Column("image_alt", sa.String(), nullable=False, server_default=""),
        sa.Column("problem", sa.Text(), nullable=False),
        sa.Column("solution", sa.Text(), nullable=False),
        sa.Column("target_users", sa.Text(), nullable=False),
        sa.Column("key_features", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("prd_content", postgresql.JSONB(), nullable=True),
        # Taxonomy fields
        sa.Column("function_slug", sa.String(), nullable=False),
        sa.Column("industry_slug", sa.String(), nullable=True),
        sa.Column("target_user_slug", sa.String(), nullable=True),
        # Metrics
        sa.Column("popularity_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        # Publication
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        # References
        sa.Column("forked_from_id", sa.Integer(), sa.ForeignKey("ideas.id"), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ideas_title", "ideas", ["title"])
    op.create_index("ix_ideas_slug", "ideas", ["slug"], unique=True)
    op.create_index("ix_ideas_function_slug", "ideas", ["function_slug"])
    op.create_index("ix_ideas_industry_slug", "ideas", ["industry_slug"])
    op.create_index("ix_ideas_target_user_slug", "ideas", ["target_user_slug"])
    op.create_index("ix_ideas_forked_from_id", "ideas", ["forked_from_id"])
    op.create_index("ix_ideas_created_by_id", "ideas", ["created_by_id"])

    # === Idea Categories junction table (legacy) ===
    op.create_table(
        "idea_categories",
        sa.Column("idea_id", sa.Integer(), sa.ForeignKey("ideas.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # === Generation Requests table ===
    op.create_table(
        "generation_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="queued"),
        sa.Column("rq_job_id", sa.String(), nullable=False),
        sa.Column("idea_id", sa.Integer(), sa.ForeignKey("ideas.id"), nullable=True),
        sa.Column("forked_from_id", sa.Integer(), sa.ForeignKey("ideas.id"), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_generation_requests_user_id", "generation_requests", ["user_id"])
    op.create_index("ix_generation_requests_rq_job_id", "generation_requests", ["rq_job_id"])
    op.create_index("ix_generation_requests_idea_id", "generation_requests", ["idea_id"])

    # === Seed taxonomy data ===
    _seed_taxonomy_data()


def _seed_taxonomy_data() -> None:
    """Insert initial taxonomy data."""
    from sqlalchemy.sql import table, column

    # Function types
    function_types = table(
        "function_types",
        column("slug"),
        column("name"),
        column("description"),
        column("display_order"),
    )
    op.bulk_insert(function_types, [
        {"slug": "create", "name": "Create", "description": "Tools for content or product generation", "display_order": 1},
        {"slug": "automate", "name": "Automate", "description": "Tools for automating repetitive tasks", "display_order": 2},
        {"slug": "analyze", "name": "Analyze", "description": "Tools for data analysis and insights", "display_order": 3},
        {"slug": "connect", "name": "Connect", "description": "Tools for communication and networking", "display_order": 4},
        {"slug": "sell", "name": "Sell", "description": "Tools for sales and monetization", "display_order": 5},
        {"slug": "learn", "name": "Learn", "description": "Tools for education and skill improvement", "display_order": 6},
        {"slug": "manage", "name": "Manage", "description": "Tools for management and organization", "display_order": 7},
        {"slug": "protect", "name": "Protect", "description": "Tools for security, backup, and privacy", "display_order": 8},
    ])

    # Industry types
    industry_types = table(
        "industry_types",
        column("slug"),
        column("name"),
        column("description"),
    )
    op.bulk_insert(industry_types, [
        {"slug": "healthcare", "name": "Healthcare", "description": "Medical, fitness, mental health"},
        {"slug": "finance", "name": "Finance", "description": "Banking, payments, personal finance"},
        {"slug": "education", "name": "Education", "description": "Learning, training, academic"},
        {"slug": "e-commerce", "name": "E-commerce", "description": "Online retail, marketplaces"},
        {"slug": "entertainment", "name": "Entertainment", "description": "Media, gaming, streaming"},
        {"slug": "technology", "name": "Technology", "description": "Software, hardware, IT services"},
        {"slug": "retail", "name": "Retail", "description": "Physical stores, consumer goods"},
        {"slug": "real-estate", "name": "Real Estate", "description": "Property, housing, rentals"},
        {"slug": "travel", "name": "Travel", "description": "Tourism, hospitality, transportation"},
        {"slug": "food", "name": "Food & Beverage", "description": "Restaurants, delivery, F&B"},
        {"slug": "manufacturing", "name": "Manufacturing", "description": "Production, logistics, supply chain"},
        {"slug": "legal", "name": "Legal", "description": "Law, compliance, contracts"},
        {"slug": "marketing", "name": "Marketing", "description": "Advertising, PR, brand management"},
        {"slug": "media", "name": "Media", "description": "News, publishing, content"},
    ])

    # Target user types
    target_user_types = table(
        "target_user_types",
        column("slug"),
        column("name"),
        column("description"),
    )
    op.bulk_insert(target_user_types, [
        {"slug": "developers", "name": "Developers", "description": "Software engineers, programmers"},
        {"slug": "creators", "name": "Creators", "description": "Content creators, YouTubers, artists"},
        {"slug": "marketers", "name": "Marketers", "description": "Marketing professionals, growth hackers"},
        {"slug": "businesses", "name": "Businesses", "description": "SMBs, business owners"},
        {"slug": "consumers", "name": "Consumers", "description": "General public, end users"},
        {"slug": "students", "name": "Students", "description": "Learners, academics"},
        {"slug": "professionals", "name": "Professionals", "description": "White-collar workers, experts"},
        {"slug": "enterprises", "name": "Enterprises", "description": "Large corporations, organizations"},
        {"slug": "freelancers", "name": "Freelancers", "description": "Independent workers, contractors"},
        {"slug": "startups", "name": "Startups", "description": "Early-stage companies, founders"},
    ])


def downgrade() -> None:
    op.drop_table("generation_requests")
    op.drop_table("idea_categories")
    op.drop_table("ideas")
    op.drop_table("target_user_types")
    op.drop_table("industry_types")
    op.drop_table("function_types")
    op.drop_table("categories")
    op.drop_table("users")
