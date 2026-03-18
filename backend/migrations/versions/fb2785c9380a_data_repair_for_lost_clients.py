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
import re
from app.core.security import encrypt_token, decrypt_token

def normalize_id(id_val: str) -> str:
    if not id_val: return None
    return re.sub(r'[^a-zA-Z0-9]', '', str(id_val))

def hash_id(id_val: str) -> str:
    norm = normalize_id(id_val)
    if not norm: return None
    return hashlib.sha256(norm.encode()).hexdigest()

def upgrade() -> None:
    connection = op.get_bind()
    
    # 1. Fetch all clients to check for normalization/hashing needs
    results = connection.execute(
        sa.text("SELECT id, name, phone, telegram_id, whatsapp_id, telegram_id_hash, whatsapp_id_hash FROM clients")
    ).fetchall()
    
    print(f"Auditing {len(results)} clients for repair...")
    
    for row in results:
        c_id, name, phone, tg_id, wa_id, tg_hash, wa_hash = row
        updates = {}
        
        # A. Resolve Phone Normalization
        if phone:
            norm_phone = normalize_id(phone)
            if norm_phone != phone:
                updates["phone"] = norm_phone
            
            # If WhatsApp hash is missing, derive it from normalized phone
            if not wa_hash:
                wa_hash = hash_id(norm_phone)
                updates["whatsapp_id_hash"] = wa_hash
                updates["whatsapp_id"] = encrypt_token(norm_phone)

        # B. Resolve Telegram IDs
        if tg_id and not tg_id.startswith('gAAAA'):
            norm_tg = normalize_id(tg_id)
            updates["telegram_id"] = encrypt_token(norm_tg)
            updates["telegram_id_hash"] = hash_id(norm_tg)
        elif tg_id and not tg_hash:
            # Encrypted but no hash
            raw_tg = normalize_id(decrypt_token(tg_id))
            updates["telegram_id_hash"] = hash_id(raw_tg)

        # C. Resolve WhatsApp IDs (if different from phone)
        if wa_id and not wa_id.startswith('gAAAA'):
            norm_wa = normalize_id(wa_id)
            updates["whatsapp_id"] = encrypt_token(norm_wa)
            updates["whatsapp_id_hash"] = hash_id(norm_wa)
        elif wa_id and not wa_hash:
            raw_wa = normalize_id(decrypt_token(wa_id))
            updates["whatsapp_id_hash"] = hash_id(raw_wa)

        if updates:
            set_clause = ", ".join([f"{k} = :{k}" for k in updates.keys()])
            connection.execute(
                sa.text(f"UPDATE clients SET {set_clause} WHERE id = :id"),
                {"id": c_id, **updates}
            )

def downgrade() -> None:
    pass
