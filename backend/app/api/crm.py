from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, delete
from datetime import timezone, datetime, timedelta

from app.core.database import get_db
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.crm import Client, Appointment
from app.models.calendar import BusySlot
from app.models.integration import Integration
from app.schemas.crm import (
    ClientCreate, ClientUpdate, ClientResponse, 
    AppointmentCreate, AppointmentResponse, AppointmentUpdate
)
from app.api.auth import get_current_user
from app.core.google_calendar import GoogleCalendarService

router = APIRouter()

async def get_user_business(db: AsyncSession, user_id: str) -> BusinessProfile:
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return business

def normalize_to_utc_naive(dt: datetime) -> datetime:
    """Ensure a datetime is converted to UTC and returned as a naive object."""
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)

@router.get("/clients", response_model=List[ClientResponse])
async def get_clients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    result = await db.execute(select(Client).where(Client.business_id == business.id))
    return result.scalars().all()

@router.post("/clients", response_model=ClientResponse)
async def create_client(
    client_in: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    client = Client(
        business_id=business.id,
        **client_in.dict()
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client

@router.patch("/clients/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    client_in: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.business_id == business.id)
    )
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = client_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client

@router.delete("/clients/{client_id}")
async def delete_client(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.business_id == business.id)
    )
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    await db.delete(client)
    await db.commit()
    return {"status": "deleted"}

@router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    result = await db.execute(
        select(Appointment)
        .where(Appointment.business_id == business.id)
        .options(selectinload(Appointment.client), selectinload(Appointment.service))
    )
    return result.scalars().all()

@router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(
    appointment_in: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    # 1. Normalize datetimes
    requested_start = normalize_to_utc_naive(appointment_in.start_time)
    requested_end = normalize_to_utc_naive(appointment_in.end_time)

    # 2. Check for overlapping local appointments
    apt_query = select(Appointment).where(
        Appointment.business_id == business.id,
        Appointment.start_time < requested_end,
        Appointment.end_time > requested_start,
        Appointment.status != "cancelled"
    )
    apt_overlap = await db.execute(apt_query)
    existing_apt = apt_overlap.scalars().first()
    if existing_apt:
        raise HTTPException(
            status_code=400, 
            detail=f"Conflict: Appointment exists from {existing_apt.start_time.strftime('%H:%M')} to {existing_apt.end_time.strftime('%H:%M')}."
        )

    # 3. Check for overlapping Google busy slots (LIVE CHECK)
    result = await db.execute(
        select(Integration).where(Integration.business_id == business.id, Integration.provider == 'google')
    )
    integration = result.scalars().first()
    if integration:
        try:
            service = GoogleCalendarService(integration, db)
            # Fetch live freebusy info for the specific range
            busy_slots = await service.get_availability(requested_start, requested_end)
            if busy_slots:
                # Even one busy slot in the range is a conflict
                raise HTTPException(
                    status_code=400, 
                    detail="Conflict: This slot is marked as busy in your Google Calendar."
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"WARNING: Google availability check failed: {e}")

    # 4. Create appointment
    result = await db.execute(select(Client).where(Client.id == appointment_in.client_id))
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    appointment = Appointment(
        business_id=business.id,
        client_id=appointment_in.client_id,
        service_id=appointment_in.service_id,
        start_time=requested_start,
        end_time=requested_end,
        status=appointment_in.status
    )
    
    # 5. Sync to Google
    if integration:
        try:
            service = GoogleCalendarService(integration, db)
            google_event_id = await service.create_event(
                summary=f"Sherpa: {client.name}",
                description=f"Client: {client.name}\nPhone: {client.phone}\nScheduled via Sherpa",
                start_time=requested_start,
                end_time=requested_end
            )
            appointment.google_event_id = google_event_id
        except Exception as e:
            print(f"ERROR: Google Sync Failed: {str(e)}")

    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment.id).options(selectinload(Appointment.client), selectinload(Appointment.service))
    )
    return result.scalars().first()

@router.patch("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: str,
    appointment_in: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    result = await db.execute(
        select(Appointment)
        .where(Appointment.id == appointment_id, Appointment.business_id == business.id)
        .options(selectinload(Appointment.client), selectinload(Appointment.service))
    )
    appointment = result.scalars().first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appointment_in.service_id is not None:
        appointment.service_id = appointment_in.service_id

    if appointment_in.start_time or appointment_in.end_time:
        new_start = normalize_to_utc_naive(appointment_in.start_time or appointment.start_time)
        new_end = normalize_to_utc_naive(appointment_in.end_time or appointment.end_time)

        # Local check
        apt_query = select(Appointment).where(
            Appointment.business_id == business.id,
            Appointment.id != appointment_id,
            Appointment.start_time < new_end,
            Appointment.end_time > new_start,
            Appointment.status != "cancelled"
        )
        apt_overlap = await db.execute(apt_query)
        if apt_overlap.scalars().first():
            raise HTTPException(status_code=400, detail="New slot overlaps with an existing appointment.")

        # Live Google Check
        result = await db.execute(
            select(Integration).where(Integration.business_id == business.id, Integration.provider == 'google')
        )
        integration = result.scalars().first()
        if integration:
            try:
                service = GoogleCalendarService(integration, db)
                busy_slots = await service.get_availability(new_start, new_end)
                if busy_slots:
                    raise HTTPException(status_code=400, detail="New slot overlaps with a busy slot in Google Calendar.")
            except HTTPException: raise
            except Exception as e: print(f"Google check failed: {e}")

        appointment.start_time = new_start
        appointment.end_time = new_end

    if appointment_in.status:
        appointment.status = appointment_in.status

    if appointment.google_event_id:
        result = await db.execute(
            select(Integration).where(Integration.business_id == business.id, Integration.provider == 'google')
        )
        integration = result.scalars().first()
        if integration:
            try:
                service = GoogleCalendarService(integration, db)
                if appointment.status == "cancelled":
                    await service.delete_event(appointment.google_event_id)
                    appointment.google_event_id = None
                else:
                    await service.update_event(
                        event_id=appointment.google_event_id,
                        summary=f"Sherpa: {appointment.client.name}",
                        description=f"Client: {appointment.client.name}\nPhone: {appointment.client.phone}\nUpdated via Sherpa",
                        start_time=appointment.start_time,
                        end_time=appointment.end_time
                    )
            except Exception as e:
                print(f"ERROR: Google Update Failed: {str(e)}")

    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    return appointment

@router.delete("/appointments/{appointment_id}")
async def delete_appointment(
    appointment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id, Appointment.business_id == business.id))
    appointment = result.scalars().first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appointment.google_event_id:
        result = await db.execute(
            select(Integration).where(Integration.business_id == business.id, Integration.provider == 'google')
        )
        integration = result.scalars().first()
        if integration:
            try:
                service = GoogleCalendarService(integration, db)
                await service.delete_event(appointment.google_event_id)
            except Exception as e:
                print(f"ERROR: Google Delete Failed: {str(e)}")

    await db.delete(appointment)
    await db.commit()
    return {"status": "deleted"}
