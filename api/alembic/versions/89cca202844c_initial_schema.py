"""initial_schema

Revision ID: 89cca202844c
Revises:
Create Date: 2025-12-22 07:36:37.084523

이 마이그레이션은 모든 테이블을 생성합니다:
- categories: 아이디어 카테고리
- users: 사용자 (구독, 크레딧 관리)
- ideas: AI 생성 아이디어
- idea_categories: 아이디어-카테고리 다대다 관계
- generation_requests: 아이디어 생성 요청 추적
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "89cca202844c"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables."""

    # =========================================================================
    # Categories 테이블
    # =========================================================================
    op.create_table(
        "categories",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("color_variant", sa.Text(), nullable=False, server_default="secondary"),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("name", name="categories_name_key"),
        sa.UniqueConstraint("slug", name="categories_slug_key"),
    )
    op.create_index("ix_categories_name", "categories", ["name"])
    op.create_index("ix_categories_slug", "categories", ["slug"])
    op.create_index("categories_display_order_idx", "categories", ["display_order", "name"])

    # =========================================================================
    # Users 테이블
    # =========================================================================

    # Enum 타입 생성
    subscription_tier_enum = postgresql.ENUM(
        "free", "pro", "enterprise", name="subscriptiontier", create_type=True
    )
    subscription_tier_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("hashed_password", sa.Text(), nullable=False),
        sa.Column(
            "subscription_tier",
            subscription_tier_enum,
            nullable=False,
            server_default="free",
        ),
        sa.Column("generation_credits", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("email", name="users_email_key"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # =========================================================================
    # Ideas 테이블
    # =========================================================================
    op.create_table(
        "ideas",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("image_alt", sa.Text(), nullable=False, server_default=""),
        sa.Column("problem", sa.Text(), nullable=False),
        sa.Column("solution", sa.Text(), nullable=False),
        sa.Column("target_users", sa.Text(), nullable=False),
        sa.Column(
            "key_features",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("prd_content", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("popularity_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("view_count", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("forked_from_id", sa.BigInteger(), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("search_vector", postgresql.TSVECTOR(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("slug", name="ideas_slug_key"),
        sa.CheckConstraint(
            "popularity_score >= 0 AND popularity_score <= 100",
            name="ideas_popularity_score_check",
        ),
        sa.CheckConstraint("view_count >= 0", name="ideas_view_count_check"),
        sa.ForeignKeyConstraint(["forked_from_id"], ["ideas.id"], name="ideas_forked_from_fkey"),
    )
    op.create_index("ix_ideas_title", "ideas", ["title"])
    op.create_index("ix_ideas_slug", "ideas", ["slug"], unique=True)
    op.create_index("ix_ideas_forked_from_id", "ideas", ["forked_from_id"])
    op.create_index("ix_ideas_created_by_id", "ideas", ["created_by_id"])
    op.create_index(
        "ideas_published_at_idx",
        "ideas",
        [sa.text("published_at DESC")],
        postgresql_where=sa.text("is_published = true"),
    )
    op.create_index(
        "ideas_popularity_idx",
        "ideas",
        [sa.text("popularity_score DESC"), sa.text("published_at DESC")],
        postgresql_where=sa.text("is_published = true"),
    )
    op.create_index(
        "ideas_cursor_pagination_idx",
        "ideas",
        [sa.text("published_at DESC"), sa.text("id DESC")],
        postgresql_where=sa.text("is_published = true"),
    )
    op.create_index(
        "ideas_search_idx",
        "ideas",
        ["search_vector"],
        postgresql_using="gin",
    )

    # =========================================================================
    # Idea Categories 조인 테이블
    # =========================================================================
    op.create_table(
        "idea_categories",
        sa.Column("idea_id", sa.BigInteger(), nullable=False),
        sa.Column("category_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("idea_id", "category_id"),
        sa.ForeignKeyConstraint(
            ["idea_id"], ["ideas.id"], name="idea_categories_idea_fkey", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name="idea_categories_category_fkey",
            ondelete="CASCADE",
        ),
    )
    op.create_index("idea_categories_category_id_idx", "idea_categories", ["category_id"])

    # =========================================================================
    # Generation Requests 테이블
    # =========================================================================

    # Enum 타입 생성
    request_status_enum = postgresql.ENUM(
        "queued", "processing", "completed", "failed", name="requeststatus", create_type=True
    )
    request_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "generation_requests",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", request_status_enum, nullable=False, server_default="queued"),
        sa.Column("rq_job_id", sa.Text(), nullable=False),
        sa.Column("idea_id", sa.BigInteger(), nullable=True),
        sa.Column("forked_from_id", sa.BigInteger(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["idea_id"], ["ideas.id"], name="generation_requests_idea_fkey"
        ),
        sa.ForeignKeyConstraint(
            ["forked_from_id"], ["ideas.id"], name="generation_requests_forked_from_fkey"
        ),
    )
    op.create_index("ix_generation_requests_user_id", "generation_requests", ["user_id"])
    op.create_index("ix_generation_requests_rq_job_id", "generation_requests", ["rq_job_id"])
    op.create_index("ix_generation_requests_idea_id", "generation_requests", ["idea_id"])

    # =========================================================================
    # Triggers (Full-text search & updated_at)
    # =========================================================================

    # Full-text search 업데이트 함수
    op.execute("""
        CREATE OR REPLACE FUNCTION ideas_search_vector_update()
        RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(NEW.problem, '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(NEW.solution, '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(NEW.target_users, '')), 'C');
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER ideas_search_vector_trigger
            BEFORE INSERT OR UPDATE OF title, problem, solution, target_users
            ON ideas
            FOR EACH ROW
            EXECUTE FUNCTION ideas_search_vector_update();
    """)

    # updated_at 자동 업데이트 함수
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS trigger AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER ideas_updated_at_trigger
            BEFORE UPDATE ON ideas
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)

    op.execute("""
        CREATE TRIGGER categories_updated_at_trigger
            BEFORE UPDATE ON categories
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)

    op.execute("""
        CREATE TRIGGER users_updated_at_trigger
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    """Drop all tables."""

    # Triggers 삭제
    op.execute("DROP TRIGGER IF EXISTS users_updated_at_trigger ON users")
    op.execute("DROP TRIGGER IF EXISTS categories_updated_at_trigger ON categories")
    op.execute("DROP TRIGGER IF EXISTS ideas_updated_at_trigger ON ideas")
    op.execute("DROP TRIGGER IF EXISTS ideas_search_vector_trigger ON ideas")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")
    op.execute("DROP FUNCTION IF EXISTS ideas_search_vector_update()")

    # 테이블 삭제 (역순)
    op.drop_table("generation_requests")
    op.drop_table("idea_categories")
    op.drop_table("ideas")
    op.drop_table("users")
    op.drop_table("categories")

    # Enum 타입 삭제
    op.execute("DROP TYPE IF EXISTS requeststatus")
    op.execute("DROP TYPE IF EXISTS subscriptiontier")
