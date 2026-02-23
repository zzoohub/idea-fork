"""product_slug_unique_per_source

Revision ID: 61cd45beede7
Revises: c3e82ceda34a
Create Date: 2026-02-23
"""
from typing import Sequence, Union

from alembic import op

revision: str = "61cd45beede7"
down_revision: Union[str, Sequence[str], None] = "c3e82ceda34a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("uq_product_slug", "product", type_="unique")
    op.create_unique_constraint(
        "uq_product_slug", "product", ["source", "slug"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_product_slug", "product", type_="unique")
    op.create_unique_constraint("uq_product_slug", "product", ["slug"])
