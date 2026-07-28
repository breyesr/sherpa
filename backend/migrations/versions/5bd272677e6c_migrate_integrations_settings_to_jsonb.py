"""migrate_integrations_settings_to_jsonb

Revision ID: 5bd272677e6c
Revises: 4159548b863e
Create Date: 2026-07-07 15:21:19.018457

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5bd272677e6c'
down_revision: Union[str, None] = '4159548b863e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE integrations ALTER COLUMN settings TYPE jsonb USING settings::jsonb")


def downgrade() -> None:
    op.execute("ALTER TABLE integrations ALTER COLUMN settings TYPE json USING settings::json")

