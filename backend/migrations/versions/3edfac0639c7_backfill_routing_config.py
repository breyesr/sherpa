"""backfill_routing_config

Revision ID: 3edfac0639c7
Revises: 3854dadb6a75
Create Date: 2026-06-29 17:49:41.021059

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3edfac0639c7'
down_revision: Union[str, None] = '3854dadb6a75'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    import json
    
    basic_routing = {
        "prospective_clients": {"enabled": False},
        "distributors_retailers": {"enabled": False},
        "sales_reps": {"enabled": True}
    }
    
    trade_routing = {
        "prospective_clients": {"enabled": True},
        "distributors_retailers": {"enabled": True},
        "sales_reps": {"enabled": True}
    }
    
    basic_routing_json = json.dumps(basic_routing)
    trade_routing_json = json.dumps(trade_routing)
    
    # Update for NULL or '{}' routing_config based on vertical_type
    op.execute(
        f"UPDATE business_profiles SET routing_config = '{basic_routing_json}' "
        f"WHERE vertical_type = 'BASIC' AND (routing_config IS NULL OR routing_config::text = '{{}}' OR routing_config::text = 'null')"
    )
    
    op.execute(
        f"UPDATE business_profiles SET routing_config = '{trade_routing_json}' "
        f"WHERE vertical_type = 'TRADE' AND (routing_config IS NULL OR routing_config::text = '{{}}' OR routing_config::text = 'null')"
    )


def downgrade() -> None:
    # Downgrade is a no-op to preserve backfilled user configurations
    pass
