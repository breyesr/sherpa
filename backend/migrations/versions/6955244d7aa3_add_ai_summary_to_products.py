"""add ai_summary to products

Revision ID: 6955244d7aa3
Revises: e71b2a94cd31
Create Date: 2026-09-22 15:13:49.452143

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6955244d7aa3'
down_revision: Union[str, None] = 'e71b2a94cd31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('products', sa.Column('ai_summary', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('products', 'ai_summary')
