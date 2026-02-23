"""add_product_tag

Revision ID: b4e2a7c1f3d0
Revises: 9dacea10fdae
Create Date: 2026-02-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b4e2a7c1f3d0"
down_revision: Union[str, Sequence[str], None] = "9dacea10fdae"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "product_tag",
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("product.id"), nullable=False),
        sa.Column("tag_id", sa.BigInteger(), sa.ForeignKey("tag.id"), nullable=False),
        sa.PrimaryKeyConstraint("product_id", "tag_id"),
    )
    op.create_index("idx_product_tag_tag_id", "product_tag", ["tag_id"])


def downgrade() -> None:
    op.drop_index("idx_product_tag_tag_id", table_name="product_tag")
    op.drop_table("product_tag")
