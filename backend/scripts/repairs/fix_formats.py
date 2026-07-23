import asyncio
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.crm import Client
from app.core.security import encrypt_token
import hashlib

async def fix_formats():
    async with SessionLocal() as db:
        print("--- NORMALIZING PHONE FORMATS AND HASHES ---")
        
        # 1. Fetch all clients
        res = await db.execute(text("SELECT id, name, phone, telegram_id, whatsapp_id, telegram_id_hash, whatsapp_id_hash FROM clients"))
        clients = res.fetchall()
        print(f"Checking {len(clients)} clients...")

        for row in clients:
            c_id, name, phone, tg_id, wa_id, tg_hash, wa_hash = row
            updates = {}
            
            # Normalize and update Phone
            if phone:
                norm_phone = Client.normalize_id(phone)
                if norm_phone != phone:
                    print(f"  [{name}] Normalizing phone: {phone} -> {norm_phone}")
                    updates["phone"] = norm_phone
                
                # Auto-populate WA hash from phone if missing
                if not wa_hash:
                    h = Client.hash_id(norm_phone)
                    print(f"  [{name}] Populating missing WA hash from phone: {h}")
                    updates["whatsapp_id_hash"] = h
                    updates["whatsapp_id"] = encrypt_token(norm_phone)

            # Normalize TG if it's plain text
            if tg_id and not tg_id.startswith('gAAAA'):
                norm_tg = Client.normalize_id(tg_id)
                updates["telegram_id"] = encrypt_token(norm_tg)
                updates["telegram_id_hash"] = Client.hash_id(norm_tg)
                print(f"  [{name}] Encrypting and hashing TG ID")

            # Normalize WA if it's plain text (and different from phone)
            if wa_id and not wa_id.startswith('gAAAA'):
                norm_wa = Client.normalize_id(wa_id)
                updates["whatsapp_id"] = encrypt_token(norm_wa)
                updates["whatsapp_id_hash"] = Client.hash_id(norm_wa)
                print(f"  [{name}] Encrypting and hashing WA ID")

            if updates:
                set_sql = ", ".join([f"{k} = :{k}" for k in updates.keys()])
                await db.execute(text(f"UPDATE clients SET {set_sql} WHERE id = :cid"), {"cid": c_id, **updates})

        await db.commit()
        print("--- FORMAT FIX COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(fix_formats())
