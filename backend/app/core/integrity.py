import asyncio
import hashlib
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.crm import Client

async def audit_database():
    """
    Scans the database for potential data integrity issues that could lead to 'lost' data.
    """
    async with SessionLocal() as db:
        print("--- RUNNING DATA INTEGRITY AUDIT ---")
        
        # 1. Check for clients missing hashes (unsearchable)
        res = await db.execute(text(
            "SELECT count(*) FROM clients WHERE (telegram_id IS NOT NULL AND telegram_id_hash IS NULL) OR (whatsapp_id IS NOT NULL AND whatsapp_id_hash IS NULL)"
        ))
        missing_hashes = res.scalar()
        if missing_hashes > 0:
            print(f"  [!] ALERT: {missing_hashes} clients are missing searchable hashes. They will be 'invisible' to the AI.")
        else:
            print("  [✓] All messaging IDs have searchable hashes.")

        # 2. Check for non-normalized phone numbers
        res = await db.execute(text(
            "SELECT count(*) FROM clients WHERE phone ~ '[^0-9a-zA-Z]'"
        ))
        dirty_phones = res.scalar()
        if dirty_phones > 0:
            print(f"  [!] WARNING: {dirty_phones} clients have non-normalized phones (symbols/spaces). This can break lookups.")
        else:
            print("  [✓] All phone numbers are normalized.")

        # 3. Check for potential split-brain (duplicates with same normalized ID)
        res = await db.execute(text("""
            SELECT business_id, telegram_id_hash, count(*) 
            FROM clients 
            WHERE telegram_id_hash IS NOT NULL 
            GROUP BY business_id, telegram_id_hash 
            HAVING count(*) > 1
        """))
        tg_dupes = res.fetchall()
        
        res = await db.execute(text("""
            SELECT business_id, whatsapp_id_hash, count(*) 
            FROM clients 
            WHERE whatsapp_id_hash IS NOT NULL 
            GROUP BY business_id, whatsapp_id_hash 
            HAVING count(*) > 1
        """))
        wa_dupes = res.fetchall()

        if tg_dupes or wa_dupes:
            print(f"  [!] CRITICAL: Found duplicate clients for the same messaging account within a business.")
        else:
            print("  [✓] No duplicate client profiles found.")

        print("--- AUDIT COMPLETE ---")
        return missing_hashes == 0 and dirty_phones == 0 and not (tg_dupes or wa_dupes)

if __name__ == "__main__":
    asyncio.run(audit_database())
