"""add logic templates and unique constraints for identity recognition

Revision ID: 31605e9df8e5
Revises: 9dc94d66cfc3
Create Date: 2026-03-17 15:36:58.430856

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '31605e9df8e5'
down_revision: Union[str, None] = '9dc94d66cfc3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add columns as nullable first
    op.add_column('assistant_configs', sa.Column('personalized_greeting', sa.String(), nullable=True))
    op.add_column('assistant_configs', sa.Column('logic_template', sa.String(), nullable=True))
    
    # 2. Populate existing rows with default values
    op.execute("UPDATE assistant_configs SET personalized_greeting = 'Hola {name}, ¿en qué puedo ayudarte hoy?'")
    op.execute("UPDATE assistant_configs SET logic_template = 'standard'")
    
    # 3. Alter columns to be NOT NULL
    op.alter_column('assistant_configs', 'personalized_greeting', nullable=False)
    op.alter_column('assistant_configs', 'logic_template', nullable=False)
    
    # 4. Update indexes
    op.drop_index('ix_clients_telegram_id', table_name='clients')
    op.create_index(op.f('ix_clients_telegram_id'), 'clients', ['telegram_id'], unique=True)
    op.drop_index('ix_clients_whatsapp_id', table_name='clients')
    op.create_index(op.f('ix_clients_whatsapp_id'), 'clients', ['whatsapp_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_clients_whatsapp_id'), table_name='clients')
    op.create_index('ix_clients_whatsapp_id', 'clients', ['whatsapp_id'], unique=False)
    op.drop_index(op.f('ix_clients_telegram_id'), table_name='clients')
    op.create_index('ix_clients_telegram_id', 'clients', ['telegram_id'], unique=False)
    op.drop_column('assistant_configs', 'logic_template')
    op.drop_column('assistant_configs', 'personalized_greeting')
