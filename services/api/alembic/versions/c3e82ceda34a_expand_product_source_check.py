"""expand_product_source_check

Revision ID: c3e82ceda34a
Revises: c7f3a2b8d910
Create Date: 2026-02-23
"""
from typing import Sequence, Union

from alembic import op

revision: str = "c3e82ceda34a"
down_revision: Union[str, Sequence[str], None] = "c7f3a2b8d910"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("chk_product_source", "product", type_="check")
    op.create_check_constraint(
        "chk_product_source",
        "product",
        "source IN ('producthunt', 'app_store', 'play_store')",
    )


def downgrade() -> None:
    op.drop_constraint("chk_product_source", "product", type_="check")
    op.create_check_constraint(
        "chk_product_source",
        "product",
        "source IN ('producthunt')",
    )
