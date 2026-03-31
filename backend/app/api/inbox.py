from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc

from app.core.database import get_db
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.messaging import Conversation, Message
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

@router.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    result = await db.execute(
        select(Conversation)
        .where(Conversation.business_id == business.id)
        .options(selectinload(Conversation.client))
        .order_by(desc(Conversation.last_message_at))
    )
    return result.scalars().all()

@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    # Verify conversation belongs to business
    res_conv = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.business_id == business.id
        )
    )
    conv = res_conv.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    return result.scalars().all()

@router.patch("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_user_business(db, current_user.id)
    
    res_conv = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.business_id == business.id
        )
    )
    conv = res_conv.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if "ai_enabled" in data:
        conv.ai_enabled = data["ai_enabled"]
    
    await db.commit()
    await db.refresh(conv)
    return conv
