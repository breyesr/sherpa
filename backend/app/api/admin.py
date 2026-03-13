from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.user import User
from app.api.auth import get_current_user, get_password_hash
from app.core.system_config import ConfigService
from app.schemas.user import UserResponse, UserCreateAdmin, UserUpdate

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
    """List all users (Admin only)."""
    result = await db.execute(select(User))
    return result.scalars().all()

@router.post("/users", response_model=UserResponse)
async def create_user_admin(
    user_in: UserCreateAdmin,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Any:
    """Create a new user (Admin only)."""
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
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user_admin(
    user_id: str,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Any:
    """Update a user (Admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
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
        
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

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
