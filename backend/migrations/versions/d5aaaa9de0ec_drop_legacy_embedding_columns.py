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
    # Drop legacy embedding columns
    op.drop_column('stores', 'embedding')
    op.drop_column('store_notes', 'embedding')
    op.drop_column('customer_notes', 'embedding')
    op.drop_column('competitors', 'embedding')


def downgrade() -> None:
    # Add back legacy embedding columns
    op.add_column('competitors', sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=1536), nullable=True))
    op.add_column('customer_notes', sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=1536), nullable=True))
    op.add_column('store_notes', sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=1536), nullable=True))
    op.add_column('stores', sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=1536), nullable=True))

