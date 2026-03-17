import asyncio
from sqlalchemy import text
from app.core.database import SessionLocal, engine
from app.models.crm import Client
from app.core.security import encrypt_token
import hashlib

async def one_click_fix():
    async with SessionLocal() as db:
        print("--- STARTING ONE-CLICK REPAIR ---")
        
        # 1. Ensure columns exist manually (in case Alembic failed)
        print("Checking for missing columns...")
        try:
            await db.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_id_hash VARCHAR"))
            await db.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp_id_hash VARCHAR"))
            await db.commit()
            print("Columns checked/added successfully.")
        except Exception as e:
            print(f"Error adding columns (they might already exist): {e}")
            await db.rollback()

        # 2. Populate hashes for existing clients
        print("Populating hashes and encrypting IDs...")
        res = await db.execute(
            text("SELECT id, name, telegram_id, whatsapp_id FROM clients WHERE (telegram_id IS NOT NULL AND telegram_id NOT LIKE 'gAAAA%') OR (whatsapp_id IS NOT NULL AND whatsapp_id NOT LIKE 'gAAAA%')")
        )
        to_fix = res.fetchall()
        print(f"Found {len(to_fix)} clients needing migration.")

        for row in to_fix:
            c_id, c_name, tg_raw, wa_raw = row
            updates = {}
            
            if tg_raw and not tg_raw.startswith('gAAAA'):
                updates["telegram_id"] = encrypt_token(tg_raw)
                updates["telegram_id_hash"] = hashlib.sha256(tg_raw.encode()).hexdigest()
            
            if wa_raw and not wa_raw.startswith('gAAAA'):
                updates["whatsapp_id"] = encrypt_token(wa_raw)
                updates["whatsapp_id_hash"] = hashlib.sha256(wa_raw.encode()).hexdigest()
            
            if updates:
                # Check for duplicate collision before updating
                # (If a new client was created with the same hash)
                for key, val in updates.items():
                    if key.endswith('_hash'):
                        collision = await db.execute(
                            text(f"SELECT id FROM clients WHERE {key} = :h AND id != :cid"),
                            {"h": val, "cid": c_id}
                        )
                        duplicate = collision.fetchone()
                        if duplicate:
                            dup_id = duplicate[0]
                            print(f"Collision! Merging duplicate {dup_id} into {c_id}")
                            await db.execute(text("UPDATE appointments SET client_id = :cid WHERE client_id = :did"), {"cid": c_id, "did": dup_id})
                            await db.execute(text("DELETE FROM clients WHERE id = :did"), {"did": dup_id})
                
                set_sql = ", ".join([f"{k} = :{k}" for k in updates.keys()])
                await db.execute(text(f"UPDATE clients SET {set_sql} WHERE id = :cid"), {"cid": c_id, **updates})
                print(f"Migrated client: {c_name} ({c_id})")

        await db.commit()
        print("--- REPAIR FINISHED SUCCESSFULLY ---")

if __name__ == "__main__":
    asyncio.run(one_click_fix())
