"""data_repair_for_lost_clients

Revision ID: fb2785c9380a
Revises: 26002a4661e1
Create Date: 2026-03-17 16:19:32.208802

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fb2785c9380a'
down_revision: Union[str, None] = '26002a4661e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


import hashlib
from app.core.security import encrypt_token

def upgrade() -> None:
    connection = op.get_bind()
    
    # 1. Fetch all clients with plain text IDs (not yet migrated)
    results = connection.execute(
        sa.text("SELECT id, telegram_id, whatsapp_id FROM clients WHERE (telegram_id IS NOT NULL AND telegram_id NOT LIKE 'gAAAA%') OR (whatsapp_id IS NOT NULL AND whatsapp_id NOT LIKE 'gAAAA%')")
    ).fetchall()
    
    print(f"Found {len(results)} clients needing repair.")
    
    for row in results:
        client_id = row[0]
        tg_raw = row[1] if (row[1] and not row[1].startswith('gAAAA')) else None
        wa_raw = row[2] if (row[2] and not row[2].startswith('gAAAA')) else None
        
        tg_hash = hashlib.sha256(tg_raw.encode()).hexdigest() if tg_raw else None
        wa_hash = hashlib.sha256(wa_raw.encode()).hexdigest() if wa_raw else None
        
        # Check for "New" client that already took this hash (Duplicate created during downtime)
        new_client = None
        if tg_hash:
            new_client = connection.execute(
                sa.text("SELECT id FROM clients WHERE telegram_id_hash = :hash AND id != :old_id"),
                {"hash": tg_hash, "old_id": client_id}
            ).fetchone()
        
        if not new_client and wa_hash:
            new_client = connection.execute(
                sa.text("SELECT id FROM clients WHERE whatsapp_id_hash = :hash AND id != :old_id"),
                {"hash": wa_hash, "old_id": client_id}
            ).fetchone()
            
        if new_client:
            new_id = new_client[0]
            print(f"Merging new client {new_id} into old client {client_id}...")
            
            # Move appointments
            connection.execute(
                sa.text("UPDATE appointments SET client_id = :old_id WHERE client_id = :new_id"),
                {"old_id": client_id, "new_id": new_id}
            )
            
            # Delete the "split-brain" duplicate
            connection.execute(
                sa.text("DELETE FROM clients WHERE id = :new_id"),
                {"new_id": new_id}
            )

        # Update the old client with encrypted ID and searchable hash
        updates = {}
        if tg_raw:
            updates["telegram_id"] = encrypt_token(tg_raw)
            updates["telegram_id_hash"] = tg_hash
        if wa_raw:
            updates["whatsapp_id"] = encrypt_token(wa_raw)
            updates["whatsapp_id_hash"] = wa_hash
            
        if updates:
            set_clause = ", ".join([f"{k} = :{k}" for k in updates.keys()])
            connection.execute(
                sa.text(f"UPDATE clients SET {set_clause} WHERE id = :id"),
                {"id": client_id, **updates}
            )

def downgrade() -> None:
    pass
