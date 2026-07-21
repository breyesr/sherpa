import asyncio
from app.core.database import SessionLocal
from app.models.user import User
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

async def check():
    target_id = "06a400f5-162b-7cf9-8000-ae7105e4e9cf"
    async with SessionLocal() as db:
        # Load user and their business profile relationship
        stmt = select(User).where(User.id == target_id).options(selectinload(User.business_profile))
        res = await db.execute(stmt)
        user = res.scalar()
        if user:
            print("USER INFO:")
            print("Email:", user.email)
            print("Role:", user.role)
            print("Is Admin:", user.is_admin)
            if user.business_profile:
                print("BUSINESS PROFILE:")
                print("Name:", user.business_profile.name)
                print("ID:", user.business_profile.id)
                print("Vertical Type:", user.business_profile.vertical_type)
                print("Features Config:", user.business_profile.features_config)
            else:
                print("No business profile linked.")
        else:
            print("User not found.")

if __name__ == "__main__":
    asyncio.run(check())
