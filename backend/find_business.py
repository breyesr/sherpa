import asyncio
from sqlalchemy.future import select
from app.core.database import SessionLocal
from app.models.business import BusinessProfile

async def find_business(user_id: str):
    async with SessionLocal() as db:
        print(f"Searching for BusinessProfile linked to User: {user_id}")
        result = await db.execute(
            select(BusinessProfile).where(BusinessProfile.user_id == user_id)
        )
        business = result.scalars().first()
        
        if business:
            print(f"Found BusinessProfile:")
            print(f"  ID: {business.id}")
            print(f"  Name: {business.name}")
            print(f"  User ID: {business.user_id}")
        else:
            print("No BusinessProfile found for this User ID.")

if __name__ == "__main__":
    user_id = "069b5d90-a9d1-711e-8000-3fde7eb6397b"
    asyncio.run(find_business(user_id))
