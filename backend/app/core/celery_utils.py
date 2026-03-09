import asyncio
from functools import wraps
from app.core.database import SessionLocal

def async_task(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        return asyncio.run(f(*args, **kwargs))
    return wrapper

async def get_async_session():
    async with SessionLocal() as session:
        yield session
