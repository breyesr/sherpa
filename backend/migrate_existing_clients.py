import asyncio
import hashlib
from sqlalchemy.future import select
from sqlalchemy import text
from app.core.database import SessionLocal, engine
from app.models.crm import Client
from app.core.security import encrypt_token

async def migrate_existing_data():
    async with SessionLocal() as db:
        print("Starting data migration for existing clients...")
        
        # Fetch all clients that have messaging IDs but no hashes
        # or have plain text IDs
        result = await db.execute(
            select(Client).where(
                (Client.telegram_id.is_not(None)) | (Client.whatsapp_id.is_not(None))
            )
        )
        clients = result.scalars().all()
        
        count = 0
        for client in clients:
            updated = False
            
            # Handle Telegram
            if client.telegram_id and not client.telegram_id.startswith("gAAAA"):
                raw_id = client.telegram_id
                client.telegram_id = encrypt_token(raw_id)
                client.telegram_id_hash = Client.hash_id(raw_id)
                updated = True
            elif client.telegram_id and not client.telegram_id_hash:
                # If it was already encrypted by manual code but hash is missing
                # This is harder since we'd need to decrypt it.
                # Assuming they were plain text before this epic.
                pass

            # Handle WhatsApp
            if client.whatsapp_id and not client.whatsapp_id.startswith("gAAAA"):
                raw_id = client.whatsapp_id
                client.whatsapp_id = encrypt_token(raw_id)
                client.whatsapp_id_hash = Client.hash_id(raw_id)
                updated = True

            if updated:
                db.add(client)
                count += 1

        if count > 0:
            await db.commit()
            print(f"Successfully migrated {count} clients.")
        else:
            print("No clients needed migration.")

if __name__ == "__main__":
    asyncio.run(migrate_existing_data())
