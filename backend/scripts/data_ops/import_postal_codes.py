import csv
import asyncio
import os
from sqlalchemy import insert, delete
from app.core.database import SessionLocal
from app.models.trade import PostalCode

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../temp/mexico_geography_database.csv")
CHUNK_SIZE = 5000

async def import_postal_codes():
    print(f"Reading geography database from: {CSV_PATH}")
    if not os.path.exists(CSV_PATH):
        print(f"Error: CSV file not found at {CSV_PATH}")
        return

    try:
        async with SessionLocal() as db:
            print("Clearing existing postal codes table...")
            await db.execute(delete(PostalCode))
            await db.commit()

            print("Importing new postal codes in chunks...")
            with open(CSV_PATH, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                chunk = []
                total = 0
                
                for row in reader:
                    postal_code_data = {
                        "zip_code": row["d_codigo"].strip().zfill(5),
                        "state": row["d_estado"].strip(),
                        "municipality": row["D_mnpio"].strip(),
                        "colonia": row["d_asenta"].strip(),
                        "city": row["D_mnpio"].strip()
                    }
                    chunk.append(postal_code_data)
                    
                    if len(chunk) >= CHUNK_SIZE:
                        await db.execute(insert(PostalCode).values(chunk))
                        await db.commit()
                        total += len(chunk)
                        print(f" -> Bulk inserted {total} records...")
                        chunk = []
                
                if chunk:
                    await db.execute(insert(PostalCode).values(chunk))
                    await db.commit()
                    total += len(chunk)
                    print(f" -> Bulk inserted {total} records...")
                    
            print(f"Finished! Successfully loaded {total} postal code records into the database.")
    except Exception as e:
        import sys
        print("\n" + "="*50, file=sys.stderr)
        print(f"ERROR OCCURRED: {type(e).__name__}", file=sys.stderr)
        if hasattr(e, 'orig'):
            print(f"DBAPI Original Error: {e.orig}", file=sys.stderr)
        else:
            print(str(e)[:1000], file=sys.stderr)
        print("="*50 + "\n", file=sys.stderr)
        sys.exit(1)




if __name__ == "__main__":
    asyncio.run(import_postal_codes())
