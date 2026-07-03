"""add_dynamic_store_action_objectives

Revision ID: 4159548b863e
Revises: 6f219e0e3362
Create Date: 2026-07-01 14:51:36.332351

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4159548b863e'
down_revision: Union[str, None] = '6f219e0e3362'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create store_action_objectives table
    op.create_table('store_action_objectives',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('business_id', sa.String(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('label', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('category', postgresql.ENUM(name='actioncategory', create_type=False), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['business_id'], ['business_profiles.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_store_action_objectives_category'), 'store_action_objectives', ['category'], unique=False)
    op.create_index(op.f('ix_store_action_objectives_id'), 'store_action_objectives', ['id'], unique=False)
    op.create_index(op.f('ix_store_action_objectives_name'), 'store_action_objectives', ['name'], unique=False)
    
    # 2. Add objective and details columns to action_templates table
    op.add_column('action_templates', sa.Column('objective', sa.String(), nullable=True))
    op.create_index(op.f('ix_action_templates_objective'), 'action_templates', ['objective'], unique=False)
    op.add_column('action_templates', sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    
    # 3. Alter column store_actions.objective to VARCHAR
    op.alter_column('store_actions', 'objective',
               existing_type=postgresql.ENUM('THREAT_RESPONSE', 'ANNIVERSARY', 'REPLENISHMENT', 'NEW_PRODUCT', 'RELATIONSHIP', 'GENERAL', name='actionobjective'),
               type_=sa.String(),
               existing_nullable=False,
               postgresql_using="objective::text")

    # 3. Backfill default objectives for all existing businesses
    connection = op.get_bind()
    result = connection.execute(sa.text("SELECT id FROM business_profiles"))
    business_ids = [row[0] for row in result.fetchall()]
    
    for biz_id in business_ids:
        defaults = [
            ("THREAT_RESPONSE", "THREAT_RESPONSE", "Acción de respuesta rápida ante movimientos de competidores directos en la zona.", "COMMERCIAL"),
            ("THREAT_RESPONSE", "THREAT_RESPONSE", "Acción de respuesta rápida ante movimientos de competidores directos en la zona.", "MARKETING"),
            ("SHARE_OF_SHELF", "Share of Shelf", "Medición y auditoría de la participación en anaquel de nuestros productos.", "MARKETING"),
            ("NEW_PRODUCT_INTRODUCTION", "new product introduction", "Acción para presentar o vender nuevos lanzamientos de catálogo.", "COMMERCIAL"),
            ("NEW_PRODUCT_INTRODUCTION", "new product introduction", "Acción para presentar o vender nuevos lanzamientos de catálogo.", "MARKETING"),
            ("INVENTORY_VELOCITY_OOS_PREVENTION", "Inventory Velocity & OOS Prevention", "Acción para reabastecer inventario, acelerar rotación y prevenir agotados.", "COMMERCIAL"),
            ("PERFECT_STORE_ASSORTMENT_COMPLIANCE", '"Perfect Store" & Assortment Compliance', "Auditoría y ejecución de estándares de Tienda Perfecta y cumplimiento de portafolio.", "COMMERCIAL"),
            ("PERFECT_STORE_ASSORTMENT_COMPLIANCE", '"Perfect Store" & Assortment Compliance', "Auditoría y ejecución de estándares de Tienda Perfecta y cumplimiento de portafolio.", "MARKETING"),
            ("SEASONAL_EVENT_ACTIVATION", "Seasonal & Event Activation", "Acciones promocionales especiales por temporalidad, festividades o eventos del canal.", "MARKETING"),
            ("TRADE_LOYALTY_VOLUME_PUSHING", "Trade Loyalty & Volume Pushing (Sell-In)", "Campaña de fidelización del canal de distribución y colocación de pedidos de volumen.", "COMMERCIAL"),
            ("POSM_MAINTENANCE_ASSET_PURITY", "POSM Maintenance & Asset Purity", "Auditoría, mantenimiento y colocación de material publicitario (POSM) y pureza de exhibidores.", "MARKETING")
        ]
        for name, label, desc, cat in defaults:
            obj_id = str(uuid.uuid4())
            connection.execute(sa.text(
                "INSERT INTO store_action_objectives (id, business_id, name, label, description, category, created_at, updated_at) "
                "VALUES (:id, :biz_id, :name, :label, :description, :category, NOW(), NOW())"
            ), {"id": obj_id, "biz_id": biz_id, "name": name, "label": label, "description": desc, "category": cat})


def downgrade() -> None:
    # 1. Revert store_actions.objective back to Enum
    op.alter_column('store_actions', 'objective',
               existing_type=sa.String(),
               type_=postgresql.ENUM('THREAT_RESPONSE', 'ANNIVERSARY', 'REPLENISHMENT', 'NEW_PRODUCT', 'RELATIONSHIP', 'GENERAL', name='actionobjective'),
               existing_nullable=False,
               postgresql_using="objective::actionobjective")
               
    # 2. Drop store_action_objectives table and indexes
    op.drop_index(op.f('ix_store_action_objectives_name'), table_name='store_action_objectives')
    op.drop_index(op.f('ix_store_action_objectives_id'), table_name='store_action_objectives')
    op.drop_index(op.f('ix_store_action_objectives_category'), table_name='store_action_objectives')
    op.drop_table('store_action_objectives')
    
    # 3. Drop action_templates.objective and details columns and indexes
    op.drop_index(op.f('ix_action_templates_objective'), table_name='action_templates')
    op.drop_column('action_templates', 'objective')
    op.drop_column('action_templates', 'details')
    # ### end Alembic commands ###
