"""add_product_custom_fields_and_catalog_config

Revision ID: a219b4c89e10
Revises: c77414e45eca
Create Date: 2026-08-31 18:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a219b4c89e10'
down_revision: Union[str, None] = 'c77414e45eca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Epic 219: Add custom_fields to products and catalog_config to business_profiles
    op.add_column('products', sa.Column('custom_fields', sa.JSON(), nullable=True))
    op.add_column('business_profiles', sa.Column('catalog_config', sa.JSON(), nullable=True))
    # Epic 220: Add allow_price_disclosure to agents
    op.add_column('agents', sa.Column('allow_price_disclosure', sa.Boolean(), server_default=sa.text('true'), nullable=False))


def downgrade() -> None:
    op.drop_column('agents', 'allow_price_disclosure')
    op.drop_column('business_profiles', 'catalog_config')
    op.drop_column('products', 'custom_fields')
