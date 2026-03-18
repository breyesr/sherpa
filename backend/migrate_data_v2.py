import asyncio
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.crm import Client
from app.core.security import encrypt_token
import hashlib

async def migrate_v2():
    async with SessionLocal() as db:
        print("--- CRM DATA RECONCILIATION V2 ---")
        
        # 1. Fetch ALL clients
        res = await db.execute(text("SELECT id, name, phone, telegram_id, whatsapp_id FROM clients"))
        clients = res.fetchall()
        print(f"Auditing {len(clients)} clients...")

        for row in clients:
            c_id, name, phone, tg_id, wa_id = row
            updates = {}
            
            # THE CORE FIX: Normalize the phone number (remove +, spaces, etc)
            # This ensures that if AI sees "123" and DB has "+123", they MATCH.
            if phone:
                norm_phone = Client.normalize_id(phone)
                if norm_phone != phone:
                    print(f"  [{name}] Normalizing Phone: {phone} -> {norm_phone}")
                    updates["phone"] = norm_phone
                
                # RE-GENERATE WhatsApp Hash from the NORMALIZED phone
                # This is the "Lost Connection" fix.
                new_wa_hash = Client.hash_id(norm_phone)
                updates["whatsapp_id_hash"] = new_wa_hash
                
                # Also ensure whatsapp_id (encrypted) is updated to the normalized version
                updates["whatsapp_id"] = encrypt_token(norm_phone)

            # Handle Telegram normalization if needed
            if tg_id:
                # If encrypted, we can't easily normalize without decrypting, 
                # but telegram IDs usually don't have symbols like +
                pass

            if updates:
                set_sql = ", ".join([f"{k} = :{k}" for k in updates.keys()])
                await db.execute(text(f"UPDATE clients SET {set_sql} WHERE id = :cid"), {"cid": c_id, **updates})

        await db.commit()
        print("--- RECONCILIATION COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(migrate_v2())
