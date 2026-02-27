"""cluster_status_default_active

Revision ID: e6b2c8d0f345
Revises: d5a1b7c9e234
Create Date: 2026-02-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "e6b2c8d0f345"
down_revision: Union[str, Sequence[str], None] = "d5a1b7c9e234"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("cluster", "status", server_default="active")


def downgrade() -> None:
    op.alter_column("cluster", "status", server_default=None)
