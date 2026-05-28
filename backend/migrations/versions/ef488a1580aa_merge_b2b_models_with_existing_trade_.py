"""Merge B2B models with existing Trade vertical

Revision ID: ef488a1580aa
Revises: 091707792b94, 475768df9d70
Create Date: 2026-05-27 16:49:46.174284

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ef488a1580aa'
down_revision: Union[str, None] = ('091707792b94', '475768df9d70')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
