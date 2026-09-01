"""add_custom_instructions_to_agent

Revision ID: dbef3b554f4f
Revises: a219b4c89e10
Create Date: 2026-09-01 12:43:57.198800

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'dbef3b554f4f'
down_revision: Union[str, None] = 'a219b4c89e10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('agents', sa.Column('custom_instructions', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('agents', 'custom_instructions')

