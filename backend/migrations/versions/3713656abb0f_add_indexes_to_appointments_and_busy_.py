"""add indexes to appointments and busy_slots for performance

Revision ID: 3713656abb0f
Revises: 96f89671f45c
Create Date: 2026-03-19 16:44:07.563110

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3713656abb0f'
down_revision: Union[str, None] = '96f89671f45c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Indexes for appointments table
    # Optimized for checking availability and listing for a business
    op.create_index('ix_appointments_business_id_start_time', 'appointments', ['business_id', 'start_time'])
    op.create_index(op.f('ix_appointments_start_time'), 'appointments', ['start_time'], unique=False)
    op.create_index(op.f('ix_appointments_end_time'), 'appointments', ['end_time'], unique=False)

    # 2. Indexes for busy_slots table
    # Critical for availability lookups which happen on every AI turn
    op.create_index('ix_busy_slots_business_id_start_time', 'busy_slots', ['business_id', 'start_time'])
    op.create_index(op.f('ix_busy_slots_start_time'), 'busy_slots', ['start_time'], unique=False)
    op.create_index(op.f('ix_busy_slots_end_time'), 'busy_slots', ['end_time'], unique=False)


def downgrade() -> None:
    # Remove indexes from busy_slots
    op.drop_index(op.f('ix_busy_slots_end_time'), table_name='busy_slots')
    op.drop_index(op.f('ix_busy_slots_start_time'), table_name='busy_slots')
    op.drop_index('ix_busy_slots_business_id_start_time', table_name='busy_slots')

    # Remove indexes from appointments
    op.drop_index(op.f('ix_appointments_end_time'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_start_time'), table_name='appointments')
    op.drop_index('ix_appointments_business_id_start_time', table_name='appointments')
