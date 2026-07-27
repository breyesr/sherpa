import asyncio
from app.core.database import SessionLocal
from app.models.user import User
from sqlalchemy.future import select

async def list_users():
    try:
        async with SessionLocal() as db:
            result = await db.execute(select(User))
            users = result.scalars().all()
            if not users:
                print("No users found in the database.")
                return
            print(f"--- REGISTERED USERS ({len(users)}) ---")
            for user in users:
                print(f"Email: {user.email} | Active: {user.is_active} | Role: {user.role}")
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    asyncio.run(list_users())
