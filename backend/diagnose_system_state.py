import asyncio
from sqlalchemy.future import select
from sqlalchemy import func
from app.core.database import SessionLocal
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.crm import Client, Appointment

async def diagnose_system_state():
    async with SessionLocal() as db:
        print("--- SYSTEM STATE DIAGNOSTIC ---")
        
        # 1. Users
        res = await db.execute(select(User))
        users = res.scalars().all()
        print(f"\nUSERS ({len(users)}):")
        for u in users:
            print(f"  - User: {u.email} ({u.id}) | Role: {u.role}")

        # 2. Businesses
        res = await db.execute(select(BusinessProfile))
        businesses = res.scalars().all()
        print(f"\nBUSINESSES ({len(businesses)}):")
        for b in businesses:
            # Count clients
            c_res = await db.execute(select(func.count(Client.id)).where(Client.business_id == b.id))
            c_count = c_res.scalar()
            # Count appointments
            a_res = await db.execute(select(func.count(Appointment.id)).where(Appointment.business_id == b.id))
            a_count = a_res.scalar()
            print(f"  - Business: {b.name} ({b.id}) | User: {b.user_id} | Clients: {c_count} | Appointments: {a_count}")

        # 3. Clients
        res = await db.execute(select(Client))
        clients = res.scalars().all()
        print(f"\nCLIENTS ({len(clients)}):")
        for c in clients:
            print(f"  - Client: {c.name} ({c.id}) | Business: {c.business_id} | Phone: {c.phone}")

        # 4. Appointments
        res = await db.execute(select(Appointment))
        appointments = res.scalars().all()
        print(f"\nAPPOINTMENTS ({len(appointments)}):")
        for a in appointments:
            print(f"  - Appointment: {a.id} | Business: {a.business_id} | Client: {a.client_id} | Status: {a.status}")

        print("\n--- END DIAGNOSTIC ---")

if __name__ == "__main__":
    asyncio.run(diagnose_system_state())
