import asyncio
from sqlalchemy.future import select
from sqlalchemy import func
from app.core.database import SessionLocal
from app.models.crm import Client
from app.models.business import BusinessProfile

async def diagnose_client_duplicates():
    async with SessionLocal() as db:
        print("--- Diagnostic: Client Duplicates Across Businesses ---")
        
        # 1. Check for Telegram Hash Duplicates
        query_tg = select(Client.telegram_id_hash, func.count(Client.id).label('count'))\
                   .where(Client.telegram_id_hash.is_not(None))\
                   .group_by(Client.telegram_id_hash)\
                   .having(func.count(Client.id) > 1)
        
        res_tg = await db.execute(query_tg)
        dupes_tg = res_tg.all()
        
        print(f"Telegram ID Hash Duplicates: {len(dupes_tg)}")
        for h, count in dupes_tg:
            print(f"\nHash: {h} (Count: {count})")
            c_query = select(Client).where(Client.telegram_id_hash == h)
            clients = (await db.execute(c_query)).scalars().all()
            for c in clients:
                b_res = await db.execute(select(BusinessProfile).where(BusinessProfile.id == c.business_id))
                b = b_res.scalars().first()
                print(f"  - Client: {c.name} ({c.id}) | Business: {b.name if b else 'Unknown'} ({c.business_id})")

        # 2. Check for WhatsApp Hash Duplicates
        query_wa = select(Client.whatsapp_id_hash, func.count(Client.id).label('count'))\
                   .where(Client.whatsapp_id_hash.is_not(None))\
                   .group_by(Client.whatsapp_id_hash)\
                   .having(func.count(Client.id) > 1)
        
        res_wa = await db.execute(query_wa)
        dupes_wa = res_wa.all()
        
        print(f"\nWhatsApp ID Hash Duplicates: {len(dupes_wa)}")
        for h, count in dupes_wa:
            print(f"\nHash: {h} (Count: {count})")
            c_query = select(Client).where(Client.whatsapp_id_hash == h)
            clients = (await db.execute(c_query)).scalars().all()
            for c in clients:
                b_res = await db.execute(select(BusinessProfile).where(BusinessProfile.id == c.business_id))
                b = b_res.scalars().first()
                print(f"  - Client: {c.name} ({c.id}) | Business: {b.name if b else 'Unknown'} ({c.business_id})")

        print("\n--- End Diagnostic ---")

if __name__ == "__main__":
    asyncio.run(diagnose_client_duplicates())
