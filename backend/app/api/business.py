from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from jose import jwt, JWTError

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

@router.get("/me", response_model=BusinessProfileResponse)
async def get_business_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == current_user.id)
        .options(
            selectinload(BusinessProfile.assistant_config),
            selectinload(BusinessProfile.integrations)
        )
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return business

@router.post("/me", response_model=BusinessProfileResponse)
async def create_business_me(
    business_in: BusinessProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if business:
        raise HTTPException(status_code=400, detail="Business profile already exists")
    
    business = BusinessProfile(
        user_id=current_user.id,
        name=business_in.name,
        category=business_in.category,
        contact_phone=business_in.contact_phone
    )
    db.add(business)
    await db.commit()
    await db.refresh(business)
    
    # Auto-create default assistant config
    assistant = AssistantConfig(business_id=business.id)
    db.add(assistant)
    await db.commit()
    await db.refresh(business, ["assistant_config"])
    
    return business

@router.patch("/me", response_model=BusinessProfileResponse)
async def update_business_me(
    business_in: BusinessProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == current_user.id)
        .options(
            selectinload(BusinessProfile.assistant_config),
            selectinload(BusinessProfile.integrations)
        )
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    update_data = business_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(business, field, value)
    
    db.add(business)
    await db.commit()
    await db.refresh(business)
    return business

@router.patch("/me/assistant", response_model=BusinessProfileResponse)
async def update_assistant_me(
    assistant_in: AssistantConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == current_user.id)
        .options(
            selectinload(BusinessProfile.assistant_config),
            selectinload(BusinessProfile.integrations)
        )
    )
    business = result.scalars().first()
    if not business or not business.assistant_config:
        raise HTTPException(status_code=404, detail="Assistant config not found")
    
    update_data = assistant_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(business.assistant_config, field, value)
    
    db.add(business.assistant_config)
    await db.commit()
    await db.refresh(business)
    return business
