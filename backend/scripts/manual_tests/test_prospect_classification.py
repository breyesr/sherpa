import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy import delete

# Ensure backend folder is in path
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.business import BusinessProfile
from app.models.user import User
from app.models.trade import Store
from app.models.crm import Client
from app.api.trade import list_stores
from app.api.crm import get_clients

async def test_classification():
    print("\n--- RUNNING PROSPECT CLASSIFICATION & ISOLATION TESTS ---")
    async with SessionLocal() as db:
        # 1. Fetch target business
        res_biz = await db.execute(select(BusinessProfile).limit(1))
        biz = res_biz.scalars().first()
        if not biz:
            print("ERROR: No business profiles found in DB.")
            return

        # Fetch associated user for auth parameter
        res_user = await db.execute(select(User).where(User.id == biz.user_id))
        current_user = res_user.scalars().first()
        if not current_user:
            # Create a mock user or use the first user
            res_user = await db.execute(select(User).limit(1))
            current_user = res_user.scalars().first()
            if not current_user:
                print("ERROR: No users found in DB.")
                return
            biz.user_id = current_user.id
            db.add(biz)
            await db.commit()

        print(f"Using Business: {biz.name} ({biz.id})")
        print(f"Using User: {current_user.email} ({current_user.id})")

        # 2. Cleanup existing test clients and stores for predictability
        await db.execute(delete(Store).where(Store.name.in_(["Test Active Store", "Test Prospect Store"])))
        await db.execute(delete(Client).where(Client.name.in_(["Test Active Client", "Test Prospect Client"])))
        await db.commit()

        # 3. Create test data
        active_store = Store(
            business_id=biz.id,
            name="Test Active Store",
            address="123 Active St",
            is_prospect=False
        )
        prospect_store = Store(
            business_id=biz.id,
            name="Test Prospect Store",
            address="456 Prospect St",
            is_prospect=True
        )
        active_client = Client(
            business_id=biz.id,
            name="Test Active Client",
            is_prospect=False
        )
        prospect_client = Client(
            business_id=biz.id,
            name="Test Prospect Client",
            is_prospect=True
        )

        db.add_all([active_store, prospect_store, active_client, prospect_client])
        await db.commit()
        await db.refresh(active_store)
        await db.refresh(prospect_store)
        await db.refresh(active_client)
        await db.refresh(prospect_client)

        try:
            # 4. Test List Stores endpoint filtering
            print("\nTesting Stores API Filtering:")
            # Filter active (default)
            stores_active = await list_stores(is_prospect=False, db=db, current_user=current_user)
            print(f"  - Active stores count: {len(stores_active)}")
            active_names = [s.name for s in stores_active]
            assert "Test Active Store" in active_names, "Active store should be in active list"
            assert "Test Prospect Store" not in active_names, "Prospect store should NOT be in active list"

            # Filter prospects
            stores_prospects = await list_stores(is_prospect=True, db=db, current_user=current_user)
            print(f"  - Prospect stores count: {len(stores_prospects)}")
            prospect_names = [s.name for s in stores_prospects]
            assert "Test Prospect Store" in prospect_names, "Prospect store should be in prospects list"
            assert "Test Active Store" not in prospect_names, "Active store should NOT be in prospects list"

            # No filter (None)
            stores_all = await list_stores(is_prospect=None, db=db, current_user=current_user)
            print(f"  - Total stores count (unfiltered): {len(stores_all)}")
            all_names = [s.name for s in stores_all]
            assert "Test Active Store" in all_names
            assert "Test Prospect Store" in all_names

            # 5. Test CRM Clients endpoint filtering
            print("\nTesting Clients API Filtering:")
            # Filter active (default)
            clients_active = await get_clients(is_prospect=False, db=db, current_user=current_user)
            print(f"  - Active clients count: {len(clients_active)}")
            active_c_names = [c.name for c in clients_active]
            assert "Test Active Client" in active_c_names, "Active client should be in active list"
            assert "Test Prospect Client" not in active_c_names, "Prospect client should NOT be in active list"

            # Filter prospects
            clients_prospects = await get_clients(is_prospect=True, db=db, current_user=current_user)
            print(f"  - Prospect clients count: {len(clients_prospects)}")
            prospect_c_names = [c.name for c in clients_prospects]
            assert "Test Prospect Client" in prospect_c_names, "Prospect client should be in prospects list"
            assert "Test Active Client" not in prospect_c_names, "Active client should NOT be in prospects list"

            # No filter (None)
            clients_all = await get_clients(is_prospect=None, db=db, current_user=current_user)
            print(f"  - Total clients count (unfiltered): {len(clients_all)}")
            all_c_names = [c.name for c in clients_all]
            assert "Test Active Client" in all_c_names
            assert "Test Prospect Client" in all_c_names

            print("\n✅ ALL TESTS PASSED SUCCESSFULLY!")

        finally:
            # 6. Cleanup test records
            await db.execute(delete(Store).where(Store.id.in_([active_store.id, prospect_store.id])))
            await db.execute(delete(Client).where(Client.id.in_([active_client.id, prospect_client.id])))
            await db.commit()

if __name__ == "__main__":
    asyncio.run(test_classification())
