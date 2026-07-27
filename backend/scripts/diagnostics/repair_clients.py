import asyncio
from sqlalchemy.future import select
from sqlalchemy import or_, text, delete
from app.core.database import SessionLocal, engine
from app.models.crm import Client, Appointment
from app.core.security import encrypt_token

async def repair_data():
    async with SessionLocal() as db:
        print("Starting comprehensive client repair...")
        
        # 1. Fetch all clients with plain text IDs (unmigrated)
        res = await db.execute(
            select(Client).where(
                (Client.telegram_id.is_not(None) & ~Client.telegram_id.like('gAAAA%')) |
                (Client.whatsapp_id.is_not(None) & ~Client.whatsapp_id.like('gAAAA%'))
            )
        )
        plain_clients = res.scalars().all()
        print(f"Found {len(plain_clients)} clients needing migration.")

        migrated_count = 0
        merged_count = 0

        for old_client in plain_clients:
            # For each old client, calculate what their hash should be
            tg_raw = old_client.telegram_id if (old_client.telegram_id and not old_client.telegram_id.startswith('gAAAA')) else None
            wa_raw = old_client.whatsapp_id if (old_client.whatsapp_id and not old_client.whatsapp_id.startswith('gAAAA')) else None
            
            tg_hash = Client.hash_id(tg_raw) if tg_raw else None
            wa_hash = Client.hash_id(wa_raw) if wa_raw else None
            
            # Check if a new client already exists with this hash (collision)
            new_client = None
            if tg_hash:
                res = await db.execute(select(Client).where(Client.telegram_id_hash == tg_hash, Client.id != old_client.id))
                new_client = res.scalars().first()
            if not new_client and wa_hash:
                res = await db.execute(select(Client).where(Client.whatsapp_id_hash == wa_hash, Client.id != old_client.id))
                new_client = res.scalars().first()
            
            if new_client:
                # COLLISION RESOLUTION: Merge new_client into old_client
                print(f"Merging {new_client.name} ({new_client.id}) into {old_client.name} ({old_client.id})...")
                
                # Move appointments from new to old
                await db.execute(
                    text("UPDATE appointments SET client_id = :old_id WHERE client_id = :new_id"),
                    {"old_id": old_client.id, "new_id": new_client.id}
                )
                
                # Delete new client
                await db.execute(delete(Client).where(Client.id == new_client.id))
                merged_count += 1
            
            # Update old client with encrypted ID and hash
            if tg_raw:
                old_client.telegram_id = encrypt_token(tg_raw)
                old_client.telegram_id_hash = tg_hash
            if wa_raw:
                old_client.whatsapp_id = encrypt_token(wa_raw)
                old_client.whatsapp_id_hash = wa_hash
            
            db.add(old_client)
            migrated_count += 1

        if migrated_count > 0 or merged_count > 0:
            await db.commit()
            print(f"Finished: Migrated {migrated_count} clients, Merged {merged_count} duplicates.")
        else:
            print("No changes needed.")

if __name__ == "__main__":
    asyncio.run(repair_data())
