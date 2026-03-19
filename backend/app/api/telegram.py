from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import uuid
import traceback
import httpx

from app.core.database import get_db
from app.models.business import BusinessProfile
from app.models.integration import Integration
from app.api.auth import get_current_user
from app.core.security import encrypt_token, decrypt_token
from app.core.telegram_service import TelegramService
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter()

@router.post("/webhook/{webhook_id}")
@limiter.limit("60/minute")
async def telegram_webhook(webhook_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Receive messages from Telegram via a unique webhook ID."""
    print(f"!!! TELEGRAM WEBHOOK PING RECEIVED for ID: {webhook_id} !!!")
    try:
        payload = await request.json()
        print(f"DEBUG: Incoming Payload: {payload}")
        
        # 1. Find the integration
        result = await db.execute(
            select(Integration).where(Integration.provider == 'telegram')
        )
        all_tg = result.scalars().all()
        integration = next((i for i in all_tg if i.settings.get("webhook_id") == webhook_id), None)
        
        if not integration:
            print(f"ERROR: Webhook ID {webhook_id} not found in database.")
            return {"status": "ignored", "reason": "invalid webhook_id"}

        # 2. Fetch business profile
        result = await db.execute(
            select(BusinessProfile)
            .where(BusinessProfile.id == integration.business_id)
            .options(selectinload(BusinessProfile.assistant_config))
        )
        business = result.scalars().first()
        if not business:
            print(f"ERROR: Business not found for integration {integration.id}")
            return {"status": "ignored", "reason": "business not found"}

        # 3. Extract Message
        message = payload.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        text = message.get("text")
        
        if not chat_id:
            print("DEBUG: Payload has no chat_id. Might be a status update or edited message.")
            return {"status": "ignored"}

        if not text:
            print(f"DEBUG: Received non-text message from {chat_id}. Ignoring.")
            return {"status": "ignored"}

        first_name = message.get("from", {}).get("first_name")
        last_name = message.get("from", {}).get("last_name")
        username = message.get("from", {}).get("username")

        print(f"DEBUG: Processing message from {chat_id}: '{text[:30]}...'")
        chat_id_str = str(chat_id)
        
        # 4. Process with AI
        from app.core.ai_service import AIService
        ai = AIService(business, db)
        
        meta = {
            "platform": "telegram",
            "first_name": first_name,
            "last_name": last_name,
            "username": username
        }
        
        try:
            # get_response now handles registration, normalization and healing
            response_text = await ai.get_response(chat_id_str, text, meta)
            print(f"DEBUG: AI Success for {chat_id_str}. Sending response...")
        except Exception as e:
            print(f"ERROR: AIService failed for {chat_id_str}: {e}")
            traceback.print_exc()
            response_text = "I'm having a bit of trouble thinking right now. Please try again in a moment."
        
        # 5. Send Response
        try:
            bot_token = decrypt_token(integration.access_token)
            await TelegramService.send_message(bot_token, chat_id, response_text)
            print(f"DEBUG: Successfully sent reply to {chat_id}")
        except Exception as se:
            print(f"CRITICAL ERROR: Failed to send Telegram message to {chat_id}: {se}")
            traceback.print_exc()

        return {"status": "ok"}
    except Exception as e:
        print(f"CRITICAL: Telegram Webhook Entry Crash: {e}")
        traceback.print_exc()
        return {"status": "error"}

@router.post("/link")
async def link_telegram(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Link a Telegram Bot to the current user's business."""
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found. Please complete onboarding.")
    
    bot_token = data.get("bot_token")
    if not bot_token:
        raise HTTPException(status_code=400, detail="bot_token is required")

    bot_info = await TelegramService.get_bot_info(bot_token)
    if not bot_info:
        raise HTTPException(status_code=400, detail="Invalid Telegram Bot Token.")

    result = await db.execute(
        select(Integration)
        .where(Integration.business_id == business.id, Integration.provider == 'telegram')
    )
    integration = result.scalars().first()
    
    if not integration:
        integration = Integration(business_id=business.id, provider='telegram', settings={})
        db.add(integration)
    
    webhook_id = integration.settings.get("webhook_id") or str(uuid.uuid4())
    webhook_res = await TelegramService.set_webhook(bot_token, webhook_id)
    
    if not webhook_res.get("ok"):
        raise HTTPException(status_code=400, detail=f"Telegram webhook error: {webhook_res.get('description')}")

    integration.access_token = encrypt_token(bot_token)
    integration.settings = {
        "webhook_id": webhook_id,
        "bot_username": bot_info.get("username"),
        "bot_name": bot_info.get("first_name"),
        "local_testing": webhook_res.get("local_skip", False)
    }
    
    await db.commit()
    return {"status": "success", "bot_username": bot_info.get("username")}

@router.get("/status")
async def get_telegram_status(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Check if Telegram is connected."""
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if not business:
        return {"connected": False}

    result = await db.execute(
        select(Integration).where(Integration.business_id == business.id, Integration.provider == 'telegram')
    )
    integration = result.scalars().first()
    if not integration:
        return {"connected": False}
    
    return {
        "connected": True,
        "bot_username": integration.settings.get("bot_username"),
        "bot_name": integration.settings.get("bot_name")
    }

@router.delete("/disconnect")
async def disconnect_telegram(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Remove Telegram integration."""
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    result = await db.execute(
        select(Integration).where(Integration.business_id == business.id, Integration.provider == 'telegram')
    )
    integration = result.scalars().first()
    
    if integration:
        try:
            token = decrypt_token(integration.access_token)
            async with httpx.AsyncClient() as http_client:
                await http_client.get(f"https://api.telegram.org/bot{token}/deleteWebhook")
        except: pass
        await db.delete(integration)
        await db.commit()
    
    return {"status": "success"}
