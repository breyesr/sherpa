"""migrate_assistant_config_to_agent

Revision ID: 0f5d75b24d21
Revises: cffdb426ea17
Create Date: 2026-05-25 13:27:32.512969

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f5d75b24d21'
down_revision: Union[str, None] = 'cffdb426ea17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Rename table
    op.rename_table('assistant_configs', 'agents')
    
    # 2. Rename PK constraint and index
    # Note: In Postgres, renaming a table doesn't automatically rename its constraints/indexes
    op.execute('ALTER TABLE agents RENAME CONSTRAINT assistant_configs_pkey TO agents_pkey')
    op.execute('ALTER INDEX ix_assistant_configs_id RENAME TO ix_agents_id')
    
    # 3. Drop unique constraint on business_id (to allow 1:N)
    op.drop_constraint('assistant_configs_business_id_key', 'agents', type_='unique')
    
    # 4. Add new columns with server defaults
    op.add_column('agents', sa.Column('role', sa.String(), nullable=False, server_default='general'))
    op.add_column('agents', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    
    # 5. Rename Foreign Key constraint
    op.execute('ALTER TABLE agents RENAME CONSTRAINT assistant_configs_business_id_fkey TO agents_business_id_fkey')


def downgrade() -> None:
    # 1. Revert FK rename
    op.execute('ALTER TABLE agents RENAME CONSTRAINT agents_business_id_fkey TO assistant_configs_business_id_fkey')
    
    # 2. Drop new columns
    op.drop_column('agents', 'is_active')
    op.drop_column('agents', 'role')
    
    # 3. Restore unique constraint
    op.create_unique_constraint('assistant_configs_business_id_key', 'agents', ['business_id'])
    
    # 4. Revert Index and PK rename
    op.execute('ALTER INDEX ix_agents_id RENAME TO ix_assistant_configs_id')
    op.execute('ALTER TABLE agents RENAME CONSTRAINT agents_pkey TO assistant_configs_pkey')
    
    # 5. Rename table back
    op.rename_table('agents', 'assistant_configs')
