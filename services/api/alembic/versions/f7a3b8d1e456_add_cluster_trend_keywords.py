"""add_cluster_trend_keywords

Revision ID: f7a3b8d1e456
Revises: e6b2c8d0f345
Create Date: 2026-02-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "f7a3b8d1e456"
down_revision: Union[str, Sequence[str], None] = "e6b2c8d0f345"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("cluster", sa.Column("trend_keywords", JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("cluster", "trend_keywords")
