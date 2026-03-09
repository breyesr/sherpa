from datetime import datetime, timedelta, timezone
from sqlalchemy.future import select
from sqlalchemy import delete
from app.core.celery_app import celery_app
from app.core.celery_utils import async_task
from app.core.database import SessionLocal
from app.models.integration import Integration
from app.models.calendar import BusySlot
from app.core.google_calendar import GoogleCalendarService

@celery_app.task(name="sync_all_calendars")
@async_task
async def sync_all_calendars():
    async with SessionLocal() as db:
        result = await db.execute(
            select(Integration).where(Integration.provider == 'google')
        )
        integrations = result.scalars().all()
        
        for integration in integrations:
            await sync_single_calendar.delay(integration.id)

@celery_app.task(name="sync_single_calendar")
@async_task
async def sync_single_calendar(integration_id: str):
    async with SessionLocal() as db:
        result = await db.execute(select(Integration).where(Integration.id == integration_id))
        integration = result.scalars().first()
        if not integration:
            return
            
        service = GoogleCalendarService(integration, db)
        
        # Sync next 14 days
        start_time = datetime.now(timezone.utc)
        end_time = start_time + timedelta(days=14)
        
        try:
            # Fetch events
            events = await service.list_events(start_time, end_time)
            
            # Clear old slots for this integration/business
            await db.execute(
                delete(BusySlot).where(
                    BusySlot.business_id == integration.business_id,
                    BusySlot.source == 'google'
                )
            )
            
            for event in events:
                start = event.get('start', {}).get('dateTime') or event.get('start', {}).get('date')
                end = event.get('end', {}).get('dateTime') or event.get('end', {}).get('date')
                
                if not start or not end:
                    continue
                    
                try:
                    # Normalize to Naive UTC
                    dt_start = datetime.fromisoformat(start.replace('Z', '+00:00')).astimezone(timezone.utc).replace(tzinfo=None)
                    dt_end = datetime.fromisoformat(end.replace('Z', '+00:00')).astimezone(timezone.utc).replace(tzinfo=None)
                except ValueError:
                    dt_start = datetime.fromisoformat(start)
                    dt_end = datetime.fromisoformat(end)

                slot = BusySlot(
                    business_id=integration.business_id,
                    start_time=dt_start,
                    end_time=dt_end,
                    source='google',
                    external_id=event.get('id')
                )
                db.add(slot)
            
            await db.commit()
            print(f"Synced {len(events)} slots for business {integration.business_id}")
        except Exception as e:
            print(f"Failed to sync calendar for business {integration.business_id}: {str(e)}")
            await db.rollback()
