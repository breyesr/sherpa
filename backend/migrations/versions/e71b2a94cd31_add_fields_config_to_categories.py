"""add_fields_config_to_categories

Revision ID: e71b2a94cd31
Revises: dbef3b554f4f
Create Date: 2026-09-05 20:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e71b2a94cd31'
down_revision: Union[str, None] = 'dbef3b554f4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('categories', sa.Column('fields_config', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('categories', 'fields_config')
