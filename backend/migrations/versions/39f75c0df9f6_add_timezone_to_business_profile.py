"""add timezone to business_profile

Revision ID: 39f75c0df9f6
Revises: 3713656abb0f
Create Date: 2026-03-19 17:52:52.686087

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '39f75c0df9f6'
down_revision: Union[str, None] = '3713656abb0f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add timezone column with UTC as default
    op.add_column('business_profiles', sa.Column('timezone', sa.String(), nullable=False, server_default='UTC'))


def downgrade() -> None:
    op.drop_column('business_profiles', 'timezone')
