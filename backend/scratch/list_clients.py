import asyncio
from sqlalchemy.future import select
from app.core.database import SessionLocal
from app.models.crm import Client
from app.models.business import BusinessProfile

async def run():
    async with SessionLocal() as db:
        # List all businesses
        res_biz = await db.execute(select(BusinessProfile))
        bizs = res_biz.scalars().all()
        print(f"Total businesses: {len(bizs)}")
        for b in bizs:
            print(f"- Biz ID: {b.id}, Name: '{b.name}'")
            
        # List all clients
        res_clients = await db.execute(select(Client))
        clients = res_clients.scalars().all()
        print(f"\nTotal clients in database: {len(clients)}")
        for c in clients:
            print(f"- ID: {c.id}, Name: '{c.name}', Phone: {c.phone}, Email: {c.email}, is_prospect: {c.is_prospect}, Biz ID: {c.business_id}")

if __name__ == "__main__":
    asyncio.run(run())
