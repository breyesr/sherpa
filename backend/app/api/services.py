from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceResponse
from app.api.auth import get_current_user

router = APIRouter()

async def get_user_business(db: AsyncSession, user_id: str) -> BusinessProfile:
    result = await db.execute(
        select(BusinessProfile).where(BusinessProfile.user_id == user_id)
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return business

@router.post("/", response_model=ServiceResponse)
async def create_service(
    service_in: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    service = Service(
        business_id=business.id,
        **service_in.dict()
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return service

@router.get("/", response_model=List[ServiceResponse])
async def list_services(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    result = await db.execute(
        select(Service).where(
            Service.business_id == business.id,
            Service.is_active == True
        )
    )
    return result.scalars().all()

@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    result = await db.execute(
        select(Service).where(
            Service.id == service_id,
            Service.business_id == business.id
        )
    )
    service = result.scalars().first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@router.patch("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str,
    service_in: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    result = await db.execute(
        select(Service).where(
            Service.id == service_id,
            Service.business_id == business.id
        )
    )
    service = result.scalars().first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_data = service_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)
    
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return service

@router.delete("/{service_id}", response_model=ServiceResponse)
async def delete_service(
    service_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    result = await db.execute(
        select(Service).where(
            Service.id == service_id,
            Service.business_id == business.id
        )
    )
    service = result.scalars().first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Soft delete
    service.is_active = False
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return service
