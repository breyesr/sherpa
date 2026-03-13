from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
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
