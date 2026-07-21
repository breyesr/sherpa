import asyncio
from app.core.database import SessionLocal
from app.models.trade import Store
from app.models.business import BusinessProfile
from sqlalchemy.future import select

async def check():
    async with SessionLocal() as db:
        res_businesses = await db.execute(select(BusinessProfile))
        businesses = res_businesses.scalars().all()
        print("BUSINESSES:")
        for b in businesses:
            print(f"- {b.name} (ID: {b.id})")
            
        res_stores = await db.execute(select(Store))
        stores = res_stores.scalars().all()
        print("\nSTORES:")
        for s in stores:
            print(f"- Name: {s.name}")
            print(f"  ID: {s.id}")
            print(f"  Business ID: {s.business_id}")
            print(f"  State: {s.state}")
            print(f"  Zip Code: {s.zip_code}")
            print(f"  Delivery Zip Codes: {s.delivery_zip_codes}")
            print(f"  Is Prospect: {s.is_prospect}")

if __name__ == "__main__":
    asyncio.run(check())
