import asyncio
from app.core.database import SessionLocal
from sqlalchemy import text

async def check():
    target_id = "06a400f5-162b-7cf9-8000-ae7105e4e9cf"
    async with SessionLocal() as db:
        tables = ["users", "business_profiles", "clients", "stores", "orders"]
        for table in tables:
            try:
                query = text(f"SELECT * FROM {table} WHERE id = :id OR CAST(id AS VARCHAR) = :id;")
                res = await db.execute(query, {"id": target_id})
                row = res.fetchone()
                if row:
                    print(f"FOUND in table '{table}':")
                    print(row)
                    print("-" * 50)
            except Exception as e:
                print(f"Error querying {table}: {e}")

if __name__ == "__main__":
    asyncio.run(check())
