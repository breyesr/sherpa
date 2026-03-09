from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.api.auth import get_current_user
from app.core.system_config import ConfigService

router = APIRouter()

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user

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
