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

def upgrade_business_to_trade(business: BusinessProfile):
    from app.api.business import get_default_routing_config, get_default_features_config
    
    # Upgrade routing_config
    curr_routing = business.routing_config or {}
    trade_routing = get_default_routing_config("TRADE")
    for key, val in trade_routing.items():
        if key not in curr_routing:
            curr_routing[key] = val
    business.routing_config = dict(curr_routing)
    
    # Upgrade features_config
    curr_features = business.features_config or {}
    trade_features = get_default_features_config("TRADE")
    for key, val in trade_features.items():
        if key not in curr_features:
            curr_features[key] = val
        elif not curr_features[key].get("enabled", False) and val.get("enabled", False):
            curr_features[key] = val
    business.features_config = dict(curr_features)

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
    
    old_vertical = business.vertical_type
    business.vertical_type = vertical_type
    if old_vertical == VerticalType.BASIC and vertical_type == VerticalType.TRADE:
        upgrade_business_to_trade(business)
        
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
    from app.api.business import get_default_routing_config, get_default_features_config
    v_type = user_in.vertical_type or VerticalType.BASIC
    business = BusinessProfile(
        user_id=user.id,
        name=f"Business of {user.email.split('@')[0]}",
        vertical_type=v_type,
        routing_config=user_in.routing_config or get_default_routing_config(v_type),
        features_config=user_in.features_config or get_default_features_config(v_type)
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
    
    # Handle vertical type and features config updates for linked business
    if user.business_profile:
        if user_in.vertical_type:
            old_vertical = user.business_profile.vertical_type
            new_vertical = user_in.vertical_type
            user.business_profile.vertical_type = new_vertical
            if old_vertical == VerticalType.BASIC and new_vertical == VerticalType.TRADE:
                upgrade_business_to_trade(user.business_profile)
        if user_in.features_config is not None:
            user.business_profile.features_config = user_in.features_config
        
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
    
    # Clean up associated B2B trade records to avoid ForeignKeyViolationError on delete
    from app.models.business import BusinessProfile
    biz_res = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
    business = biz_res.scalars().first()
    if business:
        biz_id = business.id
        from app.models.trade import Order, OrderItem, StoreAction, Store, StoreActionObjective, ActionTemplate
        from sqlalchemy import text, delete
        
        # 1. Delete order items and orders
        res_orders = await db.execute(select(Order.id).where(Order.business_id == biz_id))
        order_ids = res_orders.scalars().all()
        if order_ids:
            await db.execute(delete(OrderItem).where(OrderItem.order_id.in_(order_ids)))
            await db.execute(delete(Order).where(Order.id.in_(order_ids)))
            
        # 2. Delete store actions, objectives, and templates
        await db.execute(delete(StoreAction).where(StoreAction.business_id == biz_id))
        await db.execute(delete(StoreActionObjective).where(StoreActionObjective.business_id == biz_id))
        await db.execute(delete(ActionTemplate).where(ActionTemplate.business_id == biz_id))
        
        # 3. Clean up store_clients and store_actions in junction tables
        res_stores = await db.execute(select(Store.id).where(Store.business_id == biz_id))
        store_ids = res_stores.scalars().all()
        if store_ids:
            await db.execute(text("DELETE FROM store_clients WHERE store_id = ANY(:ids)"), {"ids": store_ids})
            await db.execute(text("DELETE FROM store_actions WHERE store_id = ANY(:ids)"), {"ids": store_ids})
            
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

@router.patch("/businesses/{business_id}/credits")
async def update_business_credits(
    business_id: str,
    payload: Dict[str, int],
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Any:
    """Update manual purchased credits for a business (Admin only)."""
    credits = payload.get("purchased_credits")
    if credits is None or credits < 0:
        raise HTTPException(status_code=400, detail="Invalid purchased_credits value.")
        
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.id == business_id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
        
    business.purchased_credits = credits
    db.add(business)
    await db.commit()
    
    return {"status": "success", "business_id": business_id, "purchased_credits": business.purchased_credits}


