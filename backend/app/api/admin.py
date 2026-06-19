from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User
from app.models.business import BusinessProfile, VerticalType
from app.api.auth import get_current_user, get_password_hash
from app.core.system_config import ConfigService
from app.schemas.user import UserResponse, UserCreateAdmin, UserUpdate
from app.models.dlq import VectorizationDLQ
from app.tasks.knowledge import sync_vector_task, delete_vector_task
from datetime import datetime
from typing import Optional

router = APIRouter()

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin and current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Any:
    """List all users with their business profiles (Admin only)."""
    result = await db.execute(
        select(User).options(selectinload(User.business_profile))
    )
    return result.scalars().all()

@router.patch("/businesses/{business_id}/vertical", response_model=Dict[str, str])
async def update_business_vertical(
    business_id: str,
    vertical_type: VerticalType,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Any:
    """Update a business vertical type (Admin only)."""
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.id == business_id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    business.vertical_type = vertical_type
    db.add(business)
    await db.commit()
    return {"status": "success", "vertical_type": vertical_type.value}

@router.post("/users", response_model=UserResponse)
async def create_user_admin(
    user_in: UserCreateAdmin,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Any:
    """Create a new user and their associated business profile (Admin only)."""
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="User already exists")
    
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=user_in.is_active,
        is_admin=user_in.is_admin or user_in.role in ["super_admin", "admin"]
    )
    db.add(user)
    await db.flush() # Get user ID
    
    # Create associated BusinessProfile
    business = BusinessProfile(
        user_id=user.id,
        name=f"Business of {user.email.split('@')[0]}",
        vertical_type=user_in.vertical_type or VerticalType.BASIC
    )
    db.add(business)
    await db.commit()
    
    # Reload with business profile for the response
    res_final = await db.execute(
        select(User)
        .where(User.id == user.id)
        .options(selectinload(User.business_profile))
    )
    return res_final.scalars().first()

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user_admin(
    user_id: str,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Any:
    """Update a user and their business vertical (Admin only)."""
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.business_profile))
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_in.email:
        user.email = user_in.email
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)
    if user_in.role is not None:
        user.role = user_in.role
        user.is_admin = user_in.role in ["super_admin", "admin"]
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    
    # Handle vertical type update for linked business
    if user_in.vertical_type and user.business_profile:
        user.business_profile.vertical_type = user_in.vertical_type
        
    db.add(user)
    await db.commit()
    
    # Reload with business profile for the response
    res_final = await db.execute(
        select(User)
        .where(User.id == user.id)
        .options(selectinload(User.business_profile))
    )
    return res_final.scalars().first()

@router.delete("/users/{user_id}")
async def delete_user_admin(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Any:
    """Delete a user (Admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.delete(user)
    await db.commit()
    return {"status": "success"}

@router.get("/settings", response_model=Dict[str, str])
async def get_admin_settings(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Any:
    """Fetch all system settings (Admin only)."""
    return await ConfigService.get_all(db)

@router.post("/settings")
async def update_admin_settings(
    settings: Dict[str, str],
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Any:
    """Update system settings (Admin only)."""
    for key, value in settings.items():
        await ConfigService.set(db, key, value)
    return {"status": "success"}

@router.get("/dlq")
async def list_dlq(
    entity_type: Optional[str] = None,
    status: Optional[str] = None,
    business_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Any:
    """List all dead-letter queue entries (Admin only)."""
    stmt = select(VectorizationDLQ)
    if entity_type:
        stmt = stmt.where(VectorizationDLQ.entity_type == entity_type)
    if status:
        stmt = stmt.where(VectorizationDLQ.status == status)
    if business_id:
        stmt = stmt.where(VectorizationDLQ.business_id == business_id)
        
    stmt = stmt.order_by(VectorizationDLQ.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/dlq/{dlq_id}/retry")
async def retry_dlq_entry(
    dlq_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Any:
    """Retry a failed task from DLQ and mark it as resolved (Admin only)."""
    result = await db.execute(
        select(VectorizationDLQ).where(VectorizationDLQ.id == dlq_id)
    )
    dlq_entry = result.scalars().first()
    if not dlq_entry:
        raise HTTPException(status_code=404, detail="DLQ entry not found")
        
    if dlq_entry.status == "resolved":
        raise HTTPException(status_code=400, detail="DLQ entry is already resolved")
        
    # Re-dispatch Celery task
    if dlq_entry.task_name == "sync_vector_task":
        sync_vector_task.delay(dlq_entry.entity_id, dlq_entry.entity_type, dlq_entry.business_id)
    elif dlq_entry.task_name == "delete_vector_task":
        delete_vector_task.delay(dlq_entry.entity_id, dlq_entry.entity_type, dlq_entry.business_id)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported task type for retry: {dlq_entry.task_name}")
        
    dlq_entry.status = "resolved"
    dlq_entry.resolved_at = datetime.utcnow()
    db.add(dlq_entry)
    await db.commit()
    
    return {
        "status": "success",
        "message": f"Successfully re-dispatched task {dlq_entry.task_name} for entity {dlq_entry.entity_id}"
    }

