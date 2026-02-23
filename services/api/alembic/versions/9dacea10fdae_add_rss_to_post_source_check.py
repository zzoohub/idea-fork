"""add_rss_to_post_source_check

Revision ID: 9dacea10fdae
Revises: a31dbf9701cd
Create Date: 2026-02-23
"""
from typing import Sequence, Union

from alembic import op

revision: str = "9dacea10fdae"
down_revision: Union[str, Sequence[str], None] = "a31dbf9701cd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("chk_post_source", "post", type_="check")
    op.create_check_constraint(
        "chk_post_source",
        "post",
        "source IN ('reddit', 'rss', 'app_store', 'play_store')",
    )


def downgrade() -> None:
    op.drop_constraint("chk_post_source", "post", type_="check")
    op.create_check_constraint(
        "chk_post_source",
        "post",
        "source IN ('reddit', 'app_store', 'play_store')",
    )
