import asyncio
from sqlalchemy.future import select
from sqlalchemy import func
from app.core.database import SessionLocal
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.crm import Client

async def diagnose_business_duplicates():
    async with SessionLocal() as db:
        print("--- Diagnostic: Business Profile Duplicates ---")
        
        # 1. Find users with multiple business profiles
        query = select(BusinessProfile.user_id, func.count(BusinessProfile.id).label('count'))\
                .group_by(BusinessProfile.user_id)\
                .having(func.count(BusinessProfile.id) > 1)
        
        res = await db.execute(query)
        duplicates = res.all()
        
        if not duplicates:
            print("No users found with multiple business profiles.")
        else:
            print(f"Found {len(duplicates)} users with multiple business profiles.")
            for user_id, count in duplicates:
                print(f"\nUser ID: {user_id}")
                
                # Fetch all profiles for this user
                p_query = select(BusinessProfile).where(BusinessProfile.user_id == user_id)
                p_res = await db.execute(p_query)
                profiles = p_res.scalars().all()
                
                for p in profiles:
                    # Count clients for each profile
                    c_query = select(func.count(Client.id)).where(Client.business_id == p.id)
                    c_res = await db.execute(c_query)
                    client_count = c_res.scalar()
                    
                    print(f"  - Profile ID: {p.id}")
                    print(f"    Name: {p.name}")
                    print(f"    Clients: {client_count}")
                    print(f"    Created: {p.id}") # UUIDv7 contains timestamp info

        # 2. General check: Orphans or multiple profiles
        print("\n--- Summary of All Business Profiles ---")
        all_p_query = select(BusinessProfile).options()
        all_p_res = await db.execute(all_p_query)
        all_profiles = all_p_res.scalars().all()
        print(f"Total Business Profiles: {len(all_profiles)}")
        
        user_map = {}
        for p in all_profiles:
            user_map[p.user_id] = user_map.get(p.user_id, 0) + 1
        
        print(f"Unique Users with Profiles: {len(user_map)}")
        
        # 3. Clients with non-existent business_id (orphans)
        orphan_query = select(Client).where(~Client.business_id.in_(select(BusinessProfile.id)))
        orphan_res = await db.execute(orphan_query)
        orphans = orphan_res.scalars().all()
        print(f"Orphaned Clients (No BusinessProfile): {len(orphans)}")
        for oc in orphans:
             print(f"  - Client: {oc.name} ({oc.id}), business_id: {oc.business_id}")

        print("\n--- End Diagnostic ---")

if __name__ == "__main__":
    asyncio.run(diagnose_business_duplicates())
