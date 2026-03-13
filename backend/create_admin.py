import asyncio
import sys
import os
from passlib.context import CryptContext

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

async def create_admin(email, password):
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI)
    SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    async with SessionLocal() as db:
        hashed_password = get_password_hash(password)
        admin_user = User(
            email=email,
            hashed_password=hashed_password,
            is_active=True,
            is_admin=True
        )
        db.add(admin_user)
        await db.commit()
        print(f"Admin user {email} created successfully!")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python create_admin.py <email> <password>")
    else:
        email = sys.argv[1]
        password = sys.argv[2]
        asyncio.run(create_admin(email, password))
