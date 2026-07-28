"""Drop legacy embedding columns

Revision ID: d5aaaa9de0ec
Revises: 92958342b182
Create Date: 2026-06-10 18:22:16.621532

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector


# revision identifiers, used by Alembic.
revision: str = 'd5aaaa9de0ec'
down_revision: Union[str, None] = '92958342b182'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop legacy embedding columns idempotently
    op.execute("ALTER TABLE stores DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE store_notes DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE customer_notes DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE competitors DROP COLUMN IF EXISTS embedding")


def downgrade() -> None:
    # Add back legacy embedding columns idempotently
    op.execute("ALTER TABLE competitors ADD COLUMN IF NOT EXISTS embedding vector(1536)")
    op.execute("ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS embedding vector(1536)")
    op.execute("ALTER TABLE store_notes ADD COLUMN IF NOT EXISTS embedding vector(1536)")
    op.execute("ALTER TABLE stores ADD COLUMN IF NOT EXISTS embedding vector(1536)")

