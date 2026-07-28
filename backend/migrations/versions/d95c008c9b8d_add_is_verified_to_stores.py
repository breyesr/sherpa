"""add_is_verified_to_stores

Revision ID: d95c008c9b8d
Revises: 7d558932e49c
Create Date: 2026-07-21 13:07:16.275072

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd95c008c9b8d'
down_revision: Union[str, None] = '7d558932e49c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add column with server default 'true' to automatically backfill existing stores
    op.add_column('stores', sa.Column('is_verified', sa.Boolean(), nullable=True, server_default='true'))
    op.create_index(op.f('ix_stores_is_verified'), 'stores', ['is_verified'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_stores_is_verified'), table_name='stores')
    op.drop_column('stores', 'is_verified')
