"""expand_post_type_check

Revision ID: c7f3a2b8d910
Revises: b4e2a7c1f3d0
Create Date: 2026-02-23
"""
from typing import Sequence, Union

from alembic import op

revision: str = "c7f3a2b8d910"
down_revision: Union[str, Sequence[str], None] = "b4e2a7c1f3d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("chk_post_type", "post", type_="check")
    op.create_check_constraint(
        "chk_post_type",
        "post",
        "post_type IS NULL OR post_type IN ("
        "'need', 'complaint', 'feature_request', 'alternative_seeking', "
        "'comparison', 'question', 'review', 'showcase', 'discussion', 'other'"
        ")",
    )


def downgrade() -> None:
    op.drop_constraint("chk_post_type", "post", type_="check")
    op.create_check_constraint(
        "chk_post_type",
        "post",
        "post_type IS NULL OR post_type IN ("
        "'complaint', 'feature_request', 'question', 'discussion', 'other'"
        ")",
    )
