import asyncio
import os
import hashlib
import re
from sqlalchemy.future import select
from sqlalchemy import func, text, delete, or_
from app.core.database import SessionLocal
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.crm import Client, Appointment

def normalize_id(id_val: str) -> str:
    if not id_val: return None
    return re.sub(r'[^a-zA-Z0-9]', '', str(id_val))

def hash_id(id_val: str) -> str:
    norm = normalize_id(id_val)
    if not norm: return None
    return hashlib.sha256(norm.encode()).hexdigest()

async def production_repair():
    async with SessionLocal() as db:
        print("=== SHERPA PRODUCTION DATA REPAIR ===")
        
        # PHASE 1: DIAGNOSTIC
        print("\n1. Auditing Business Profiles per User...")
        # Find users with more than 1 business profile
        query = select(BusinessProfile.user_id, func.count(BusinessProfile.id).label('count'))\
                .group_by(BusinessProfile.user_id)\
                .having(func.count(BusinessProfile.id) > 1)
        
        res = await db.execute(query)
        duplicates = res.all()
        
        if not duplicates:
            print("   SUCCESS: No duplicate business profiles found.")
        else:
            print(f"   WARNING: Found {len(duplicates)} users with multiple business profiles.")
            for user_id, count in duplicates:
                print(f"\n   User: {user_id}")
                p_query = select(BusinessProfile).where(BusinessProfile.user_id == user_id).order_by(BusinessProfile.id)
                profiles = (await db.execute(p_query)).scalars().all()
                
                # Keep the first one, mark others as "Duplicate"
                primary = profiles[0]
                others = profiles[1:]
                print(f"     [PRIMARY] {primary.name} ({primary.id})")
                
                for other in others:
                    # Check if the duplicate has clients
                    c_res = await db.execute(select(func.count(Client.id)).where(Client.business_id == other.id))
                    c_count = c_res.scalar()
                    print(f"     [DUPLICATE] {other.name} ({other.id}) - Clients: {c_count}")
                    
                    if c_count > 0:
                        print(f"     -> REPAIRING: Moving {c_count} clients to Primary Profile...")
                        await db.execute(
                            text("UPDATE clients SET business_id = :primary_id WHERE business_id = :other_id"),
                            {"primary_id": primary.id, "other_id": other.id}
                        )
                        # Also move appointments just in case
                        await db.execute(
                            text("UPDATE appointments SET business_id = :primary_id WHERE business_id = :other_id"),
                            {"primary_id": primary.id, "other_id": other.id}
                        )

        # PHASE 2: ORPHANED CLIENTS
        print("\n2. Checking for Orphaned Clients...")
        # Clients pointing to a business_id that doesn't exist
        orphan_query = select(Client).where(~Client.business_id.in_(select(BusinessProfile.id)))
        orphans = (await db.execute(orphan_query)).scalars().all()
        
        if not orphans:
            print("   SUCCESS: No orphaned clients found.")
        else:
            print(f"   WARNING: Found {len(orphans)} orphaned clients.")
            # We can't automatically re-assign them without knowing the user.
            # Usually these are caused by deleted BusinessProfiles.
            for c in orphans:
                print(f"     Client: {c.name} ({c.id}) | BusinessID: {c.business_id}")

        # PHASE 3: CLIENT HASH INTEGRITY
        print("\n3. Repairing Client Identity Hashes...")
        # This fixes the "Clients exist but AI creates new ones" issue
        res = await db.execute(select(Client))
        clients = res.scalars().all()
        repair_count = 0
        
        for client in clients:
            updated = False
            # Fix WhatsApp Hash from Phone
            if client.phone:
                norm_phone = normalize_id(client.phone)
                expected_hash = hash_id(norm_phone)
                if client.whatsapp_id_hash != expected_hash:
                    client.whatsapp_id_hash = expected_hash
                    updated = True
            
            if updated:
                db.add(client)
                repair_count += 1
        
        if repair_count > 0:
            print(f"   SUCCESS: Repaired hashes for {repair_count} clients.")
        else:
            print("   SUCCESS: All client hashes are valid.")

        await db.commit()
        print("\n=== REPAIR FINISHED ===")

if __name__ == "__main__":
    asyncio.run(production_repair())
