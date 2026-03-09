from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import requests

from app.core.database import get_db
from app.models.business import BusinessProfile
from app.models.integration import Integration
from app.api.auth import get_current_user
from app.core.security import encrypt_token, decrypt_token

router = APIRouter()

@router.post("/webhook/{token}")
async def telegram_webhook(token: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Receive messages from Telegram."""
    payload = await request.json()
    print(f"DEBUG: Telegram Webhook received: {payload}")
    
    # Simple logic to find the integration by bot_token (matches the path)
    result = await db.execute(
        select(Integration).where(Integration.provider == 'telegram')
    )
    all_tg = result.scalars().all()
    integration = next((i for i in all_tg if decrypt_token(i.access_token) == token), None)
    
    if not integration:
        return {"status": "ignored", "reason": "invalid token"}

    # Eager load assistant_config
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.id == integration.business_id)
        .options(selectinload(BusinessProfile.assistant_config))
    )
    business = result.scalars().first()

    message = payload.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    text = message.get("text")
    first_name = message.get("from", {}).get("first_name")

    if chat_id and text:
        from app.core.ai_service import AIService
        ai = AIService(business, db)
        
        user_message = text
        if first_name:
            user_message = f"(User First Name: {first_name}) {text}"
            
        try:
            response_text = await ai.get_response(str(chat_id), user_message)
        except Exception as e:
            print(f"ERROR: AI Service failed: {e}")
            response_text = "I'm having trouble thinking right now. Please try again in a moment."
        
        # Use decrypted token to send
        send_url = f"https://api.telegram.org/bot{token}/sendMessage"
        requests.post(send_url, json={"chat_id": chat_id, "text": response_text})

    return {"status": "ok"}

@router.post("/link")
async def link_telegram(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Save Telegram Bot Token for this business."""
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    token = data.get("bot_token")
    if not token:
        raise HTTPException(status_code=400, detail="bot_token is required")

    # 1. Uniqueness check
    result = await db.execute(select(Integration).where(Integration.provider == 'telegram'))
    all_tg = result.scalars().all()
    if any(decrypt_token(i.access_token) == token and i.business_id != business.id for i in all_tg):
        raise HTTPException(status_code=400, detail="This Telegram Bot is already connected to another account.")

    # 2. Upsert Integration (with encryption)
    result = await db.execute(
        select(Integration)
        .where(Integration.business_id == business.id, Integration.provider == 'telegram')
    )
    integration = result.scalars().first()
    
    if not integration:
        integration = Integration(business_id=business.id, provider='telegram')
        db.add(integration)
    
    integration.access_token = encrypt_token(token)
    
    from app.core.config import settings
    # Set Webhook automatically
    webhook_url = f"{settings.BASE_URL}{settings.API_V1_STR}/telegram/webhook/{token}"
    set_webhook_url = f"https://api.telegram.org/bot{token}/setWebhook"
    try:
        requests.get(set_webhook_url, params={"url": webhook_url})
    except: pass
    
    await db.commit()
    return {"status": "success"}
