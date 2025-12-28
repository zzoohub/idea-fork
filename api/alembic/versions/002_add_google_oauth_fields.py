"""Add Google OAuth fields to users table.

Revision ID: 002_google_oauth
Revises: 001_initial
Create Date: 2024-12-28

Changes:
- Add google_id column (unique, indexed) for Google OAuth identification
- Add name column for user display name
- Add avatar_url column for user profile picture
- Make hashed_password nullable (OAuth users don't have passwords)
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "002_google_oauth"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add Google OAuth fields
    op.add_column("users", sa.Column("google_id", sa.String(), nullable=True))
    op.add_column("users", sa.Column("name", sa.String(), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(), nullable=True))

    # Create unique index on google_id
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)

    # Make hashed_password nullable for OAuth users
    op.alter_column("users", "hashed_password", nullable=True)


def downgrade() -> None:
    # Revert hashed_password to non-nullable
    op.alter_column("users", "hashed_password", nullable=False)

    # Drop index and columns
    op.drop_index("ix_users_google_id", table_name="users")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "name")
    op.drop_column("users", "google_id")
