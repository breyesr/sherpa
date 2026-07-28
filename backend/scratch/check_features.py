import asyncio
from app.core.database import SessionLocal
from app.models.business import BusinessProfile
from sqlalchemy.future import select

async def check():
    async with SessionLocal() as db:
        res = await db.execute(select(BusinessProfile))
        businesses = res.scalars().all()
        print(f"TOTAL BUSINESSES: {len(businesses)}")
        for b in businesses:
            print(f"- Business: {b.name} (ID: {b.id})")
            print(f"  Vertical: {b.vertical_type}")
            print(f"  Features Config: {b.features_config}")
            print("-" * 50)

if __name__ == "__main__":
    asyncio.run(check())
