from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from app.models.business import BusinessProfile
from app.models.user import User

async def get_business(db: AsyncSession, user_id: str) -> BusinessProfile:
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

async def get_b2b_business(db: AsyncSession, current_user: User) -> BusinessProfile:
    from app.core.constants import DEFAULT_FEATURES_CONFIG
    cfg = current_user.business_profile.features_config or DEFAULT_FEATURES_CONFIG
    if not cfg.get("b2b_solutions", {}).get("enabled", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="El módulo 'b2b_solutions' no está habilitado para esta cuenta."
        )
    return await get_business(db, current_user.id)
