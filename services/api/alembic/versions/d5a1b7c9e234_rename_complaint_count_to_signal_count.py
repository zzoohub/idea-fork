"""rename_complaint_count_to_signal_count

Revision ID: d5a1b7c9e234
Revises: 61cd45beede7
Create Date: 2026-02-24
"""
from typing import Sequence, Union

from alembic import op

revision: str = "d5a1b7c9e234"
down_revision: Union[str, Sequence[str], None] = "61cd45beede7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("product", "complaint_count", new_column_name="signal_count")
    op.drop_constraint("chk_product_complaint_count", "product", type_="check")
    op.create_check_constraint(
        "chk_product_signal_count", "product", "signal_count >= 0"
    )
    op.drop_index("idx_product_complaints", "product")
    op.execute(
        "CREATE INDEX idx_product_signals ON product (signal_count DESC, id DESC)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_product_signals")
    op.create_index(
        "idx_product_complaints",
        "product",
        ["complaint_count DESC", "id DESC"],
    )
    op.drop_constraint("chk_product_signal_count", "product", type_="check")
    op.create_check_constraint(
        "chk_product_complaint_count", "product", "complaint_count >= 0"
    )
    op.alter_column("product", "signal_count", new_column_name="complaint_count")
