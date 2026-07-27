import asyncio
from sqlalchemy.future import select
from sqlalchemy import or_, text
from app.core.database import SessionLocal
from app.models.crm import Client, Appointment
from app.core.security import encrypt_token

async def diagnose():
    async with SessionLocal() as db:
        print("--- Diagnostic Report ---")
        
        # 1. Check for clients with plain text IDs (not yet migrated)
        res = await db.execute(
            select(Client).where(
                (Client.telegram_id.is_not(None) & ~Client.telegram_id.like('gAAAA%')) |
                (Client.whatsapp_id.is_not(None) & ~Client.whatsapp_id.like('gAAAA%'))
            )
        )
        plain_clients = res.scalars().all()
        print(f"Clients with plain text IDs: {len(plain_clients)}")
        for c in plain_clients:
            print(f"  - ID: {c.id}, Name: {c.name}, TG: {c.telegram_id}, WA: {c.whatsapp_id}")

        # 2. Check for clients with hashes (already migrated or new)
        res = await db.execute(
            select(Client).where(
                (Client.telegram_id_hash.is_not(None)) |
                (Client.whatsapp_id_hash.is_not(None))
            )
        )
        hashed_clients = res.scalars().all()
        print(f"Clients with hashes: {len(hashed_clients)}")

        # 3. Check for potential collisions (same ID in both plain and hashed)
        collisions = 0
        for pc in plain_clients:
            tg_hash = Client.hash_id(pc.telegram_id) if pc.telegram_id else None
            wa_hash = Client.hash_id(pc.whatsapp_id) if pc.whatsapp_id else None
            
            if tg_hash:
                res = await db.execute(select(Client).where(Client.telegram_id_hash == tg_hash, Client.id != pc.id))
                other = res.scalars().first()
                if other:
                    print(f"  !!! Collision found for TG {pc.telegram_id} !!!")
                    print(f"      Old Client: {pc.name} ({pc.id})")
                    print(f"      New Client: {other.name} ({other.id})")
                    collisions += 1
            
            if wa_hash:
                res = await db.execute(select(Client).where(Client.whatsapp_id_hash == wa_hash, Client.id != pc.id))
                other = res.scalars().first()
                if other:
                    print(f"  !!! Collision found for WA {pc.whatsapp_id} !!!")
                    print(f"      Old Client: {pc.name} ({pc.id})")
                    print(f"      New Client: {other.name} ({other.id})")
                    collisions += 1
        
        print(f"Total potential collisions: {collisions}")
        print("--- End Report ---")

if __name__ == "__main__":
    asyncio.run(diagnose())
