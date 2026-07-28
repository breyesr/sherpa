"""add_purchased_credits_to_business

Revision ID: 7d558932e49c
Revises: 5bd272677e6c
Create Date: 2026-07-07 15:38:18.094025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7d558932e49c'
down_revision: Union[str, None] = '5bd272677e6c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('business_profiles', sa.Column('purchased_credits', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_column('business_profiles', 'purchased_credits')

