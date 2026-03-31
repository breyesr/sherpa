from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.business import BusinessProfile, AssistantConfig
from app.schemas.business import (
    BusinessProfileCreate, BusinessProfileUpdate, BusinessProfileResponse,
    AssistantConfigUpdate
)
from app.api.auth import get_current_user
from app.core.limiter import limiter

router = APIRouter()

async def get_full_business(db: AsyncSession, user_id: str) -> BusinessProfile:
    """Helper to fetch a business by user_id with all relationships eagerly loaded."""
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == user_id)
        .options(
            selectinload(BusinessProfile.assistant_config),
            selectinload(BusinessProfile.integrations)
        )
    )
    return result.scalars().first()

from pydantic import BaseModel
from app.core.ai_service import AIService

class TestChatRequest(BaseModel):
    message: str
    assistant_config: Optional[AssistantConfigUpdate] = None

from sqlalchemy import func
from app.models.crm import Client, Appointment

@router.get("/stats")
async def get_business_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_full_business(db, current_user.id)
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    print(f"DEBUG STATS: Fetching for business {business.id} ({business.name})")
    
    # 1. Total Clients
    client_count_res = await db.execute(
        select(func.count(Client.id)).where(Client.business_id == business.id)
    )
    total_clients = client_count_res.scalar() or 0
    print(f"DEBUG STATS: total_clients={total_clients}")
    
    # 2. Total Appointments (All time)
    apt_count_res = await db.execute(
        select(func.count(Appointment.id)).where(Appointment.business_id == business.id)
    )
    total_appointments = apt_count_res.scalar() or 0
    print(f"DEBUG STATS: total_appointments={total_appointments}")
    
    # 3. Flagged Clients (Action Required)
    # Use a safer check for JSONB
    flagged_count_res = await db.execute(
        select(func.count(Client.id)).where(
            Client.business_id == business.id,
            func.coalesce(func.json_extract_path_text(Client.custom_fields, 'needs_review'), 'false') == 'true'
        )
    )
    flagged_clients = flagged_count_res.scalar() or 0
    print(f"DEBUG STATS: flagged_clients={flagged_clients}")
    
    # 4. Today's Appointments
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    today_count_res = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.business_id == business.id,
            Appointment.start_time >= today_start,
            Appointment.start_time < today_end,
            Appointment.status != "cancelled"
        )
    )
    today_appointments = today_count_res.scalar() or 0
    print(f"DEBUG STATS: today_appointments={today_appointments}")
    
    # 5. Upcoming & Recent (Focus on the last 24h + future)
    yesterday = now - timedelta(days=1)
    upcoming_res = await db.execute(
        select(Appointment)
        .where(
            Appointment.business_id == business.id,
            Appointment.start_time >= yesterday,
            Appointment.status != "cancelled"
        )
        .options(selectinload(Appointment.client), selectinload(Appointment.service))
        .order_by(Appointment.start_time)
        .limit(10)
    )
    upcoming = upcoming_res.scalars().all()
    print(f"DEBUG STATS: upcoming_count={len(upcoming)}")
    
    return {
        "total_clients": total_clients,
        "total_appointments": total_appointments,
        "flagged_clients": flagged_clients,
        "today_appointments": today_appointments,
        "upcoming": upcoming,
        "business_name": business.name
    }

@router.post("/test-chat")
@limiter.limit("10/minute")
async def test_chat(
    request: Request,
    payload: TestChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_full_business(db, current_user.id)
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    # If the user is previewing new config, temporarily override it
    if payload.assistant_config:
        for field, value in payload.assistant_config.dict(exclude_unset=True).items():
            setattr(business.assistant_config, field, value)
    
    ai_service = AIService(business, db)
    # Use a dummy identifier for testing
    test_id = f"test_{current_user.id}"
    response = await ai_service.get_response(identifier=test_id, user_message=payload.message, metadata={"name": current_user.email, "platform": "sandbox"})
    
    return {"response": response}

@router.get("/me", response_model=BusinessProfileResponse)
async def get_business_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_full_business(db, current_user.id)
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return business

@router.post("/me", response_model=BusinessProfileResponse)
async def create_business_me(
    business_in: BusinessProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    try:
        # Check if exists
        result = await db.execute(
            select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
        )
        business = result.scalars().first()
        
        if not business:
            business = BusinessProfile(
                user_id=current_user.id,
                name=business_in.name,
                category=business_in.category,
                contact_phone=business_in.contact_phone
            )
            db.add(business)
            await db.flush() # Get the ID without committing yet
            
            # Auto-create default assistant config
            assistant = AssistantConfig(business_id=business.id)
            db.add(assistant)
        else:
            business.name = business_in.name
            business.category = business_in.category
            business.contact_phone = business_in.contact_phone
            db.add(business)

        await db.commit()
        # Return fully loaded business
        return await get_full_business(db, current_user.id)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/me/activate-trial", response_model=BusinessProfileResponse)
async def activate_trial(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    business.trial_expires_at = datetime.utcnow() + timedelta(days=30)
    business.is_active = True
    
    db.add(business)
    await db.commit()
    return await get_full_business(db, current_user.id)

@router.patch("/me", response_model=BusinessProfileResponse)
async def update_business_me(
    business_in: BusinessProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    update_data = business_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(business, field, value)
    
    db.add(business)
    await db.commit()
    return await get_full_business(db, current_user.id)

@router.patch("/me/assistant", response_model=BusinessProfileResponse)
async def update_assistant_me(
    assistant_in: AssistantConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # Need to load assistant_config to update it
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == current_user.id)
        .options(selectinload(BusinessProfile.assistant_config))
    )
    business = result.scalars().first()
    if not business or not business.assistant_config:
        raise HTTPException(status_code=404, detail="Assistant config not found")
    
    update_data = assistant_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(business.assistant_config, field, value)
    
    db.add(business.assistant_config)
    await db.commit()
    return await get_full_business(db, current_user.id)
