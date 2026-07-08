import asyncio
import logging
from sqlalchemy.future import select
from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.trade import PostalCode
from app.core.postal_seeder import seed_postal_codes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    async with SessionLocal() as db:
        # Check if any postal codes are present
        result = await db.execute(select(func.count(PostalCode.id)))
        count = result.scalar() or 0
        if count == 0:
            logger.info("Postal codes table is empty. Preloading core SEPOMEX data...")
            await seed_postal_codes(db)
            await db.commit()
            logger.info("Core SEPOMEX data preloaded successfully.")
        else:
            logger.info(f"Postal codes table already has {count} records. Skipping preloading.")

if __name__ == "__main__":
    asyncio.run(main())
