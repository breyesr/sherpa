import asyncio
from app.core.database import SessionLocal
from app.models.trade import Product, Category
from sqlalchemy.future import select

async def check():
    async with SessionLocal() as db:
        res = await db.execute(
            select(Product).join(Category).where(Category.business_id == "06a3ac9d-26a9-78dc-8000-98268a466415")
        )
        products = res.scalars().all()
        print("PRODUCTS:")
        for p in products:
            print(f"- {p.name}")
            print(f"  ID: {p.id}")
            print(f"  Wholesale Threshold: {p.wholesale_threshold}")
            print(f"  Price: {p.price}")

if __name__ == "__main__":
    asyncio.run(check())
