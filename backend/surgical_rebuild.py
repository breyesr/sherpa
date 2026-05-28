import asyncio
import os
import sys

# Add backend root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.core.database import engine, Base
from app.models import (
    User, BusinessProfile, Agent, Integration, BusySlot, Client, Appointment,
    Service, Conversation, Message, SystemConfiguration, Store, StoreNote,
    Category, Product, Order, OrderItem, Competitor, CustomerNote
)
from sqlalchemy import text

async def surgical_rebuild():
    print("--- STARTING SURGICAL B2B REBUILD ON RAILWAY ---")
    
    # 1. Drop corrupted tables only
    tables_to_drop = [
        "store_clients", "order_items", "orders", "store_notes", "customer_notes", 
        "competitors", "products", "categories", "stores", "assistant_configs", 
        "agents", "data_imports", "alembic_version"
    ]
    
    async with engine.begin() as conn:
        print(f"Dropping {len(tables_to_drop)} corrupted tables...")
        for table in tables_to_drop:
            try:
                await conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                print(f"  - Dropped {table}")
            except Exception as e:
                print(f"  - Error dropping {table}: {e}")
        
        # Also drop the vertical_type enum if it exists to recreate it clean
        try:
            await conn.execute(text("DROP TYPE IF EXISTS verticaltype CASCADE"))
            await conn.execute(text("DROP TYPE IF EXISTS orderstatus CASCADE"))
            await conn.execute(text("DROP TYPE IF EXISTS importstatus CASCADE"))
        except: pass

        print("\nEnsuring pgvector extension is installed on remote database...")
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector CASCADE;"))
            print("✅ pgvector extension is active.")
        except Exception as e:
            print(f"❌ Error creating vector extension (Railway Postgres might need manual activation if it's an old instance): {e}")

        print("\nRe-creating clean B2B infrastructure...")
        # create_all uses current Python models as source of truth
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Clean B2B tables created.")

        # 2. Ensure vertical_type column exists and is set correctly
        print("\nFinalizing Business Profiles...")
        try:
            await conn.execute(text("ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS vertical_type VARCHAR DEFAULT 'TRADE'"))
        except Exception: pass
        
        try:
            # We first try dropping default, casting to enum, then setting default
            await conn.execute(text("ALTER TABLE business_profiles ALTER COLUMN vertical_type DROP DEFAULT"))
            await conn.execute(text("ALTER TABLE business_profiles ALTER COLUMN vertical_type TYPE verticaltype USING vertical_type::verticaltype"))
            await conn.execute(text("ALTER TABLE business_profiles ALTER COLUMN vertical_type SET DEFAULT 'BASIC'::verticaltype"))
        except Exception: pass

        await conn.execute(text("UPDATE business_profiles SET vertical_type = 'TRADE'"))
        print("✅ Business vertical set to TRADE.")

    print("\n--- REBUILD COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(surgical_rebuild())
