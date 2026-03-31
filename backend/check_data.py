import asyncio
from app.core.database import SessionLocal
from app.models.crm import Client, Appointment
from sqlalchemy.future import select

async def check():
    async with SessionLocal() as db:
        res_clients = await db.execute(select(Client))
        clients = res_clients.scalars().all()
        print(f"TOTAL CLIENTS: {len(clients)}")
        for c in clients:
            print(f"- Client: {c.name} (ID: {c.id})")

        res_apts = await db.execute(select(Appointment))
        apts = res_apts.scalars().all()
        print(f"TOTAL APPOINTMENTS: {len(apts)}")
        for a in apts:
            print(f"- Apt: {a.start_time} (Status: {a.status}, ID: {a.id})")

if __name__ == "__main__":
    asyncio.run(check())
