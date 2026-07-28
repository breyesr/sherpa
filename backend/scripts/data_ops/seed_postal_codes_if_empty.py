import asyncio
import logging
from sqlalchemy.future import select

from app.core.database import SessionLocal
from app.models.trade import PostalCode
from app.core.postal_seeder import CORE_POSTAL_CODES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    async with SessionLocal() as db:
        # Fetch all existing zip_code and colonia combinations
        result = await db.execute(select(PostalCode.zip_code, PostalCode.colonia))
        existing = {(r[0], r[1]) for r in result.all()}
        
        to_add = []
        for item in CORE_POSTAL_CODES:
            key = (item["zip_code"], item["colonia"])
            if key not in existing:
                to_add.append(
                    PostalCode(
                        zip_code=item["zip_code"],
                        colonia=item["colonia"],
                        municipality=item["municipality"],
                        city=item["city"],
                        state=item["state"]
                    )
                )
        
        if to_add:
            logger.info(f"Adding {len(to_add)} missing core postal codes to the database...")
            db.add_all(to_add)
            await db.commit()
            logger.info("Core postal codes updated successfully.")
        else:
            logger.info("All core postal codes are already present in the database. Skipping update.")

if __name__ == "__main__":
    asyncio.run(main())
