import asyncio
from sqlalchemy.future import select
from app.core.database import SessionLocal
from app.models.crm import Appointment
from app.models.integration import Integration
from app.core.google_calendar import GoogleCalendarService
from datetime import datetime, timedelta

async def diagnose():
    async with SessionLocal() as db:
        print("--- Diagnostic: Appointments vs Google Calendar ---")
        
        # 1. Fetch all local appointments
        res = await db.execute(select(Appointment))
        apts = res.scalars().all()
        
        print(f"Total Local Appointments: {len(apts)}")
        for a in apts:
            print(f"  - Apt: {a.id} | Start: {a.start_time} | GoogleID: {a.google_event_id}")

        # 2. Fetch Google Events for the first business with an integration
        res = await db.execute(select(Integration).where(Integration.provider == 'google'))
        integration = res.scalars().first()
        
        if integration:
            print(f"\nFetching Google Events for Business: {integration.business_id}")
            service = GoogleCalendarService(integration, db)
            start = datetime.utcnow() - timedelta(days=7)
            end = start + timedelta(days=14)
            events = await service.list_events(start, end)
            
            print(f"Total Google Events: {len(events)}")
            for e in events:
                print(f"  - Google Event: {e.get('id')} | Summary: {e.get('summary')} | Start: {e.get('start')}")
        else:
            print("\nNo Google integration found.")

if __name__ == "__main__":
    asyncio.run(diagnose())
