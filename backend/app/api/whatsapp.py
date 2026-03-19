from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import json
import traceback

from app.core.database import get_db
from app.models.business import BusinessProfile
from app.models.integration import Integration
from app.api.auth import get_current_user
from app.core.security import encrypt_token, decrypt_token
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter()

@router.get("/webhook")
async def verify_whatsapp(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge")
):
    """WhatsApp Webhook verification."""
    # Logic to verify hub_verify_token...
    # For now, we return hub_challenge if verify_token matches a generic one
    # or specific one if we want.
    return Response(content=hub_challenge)

@router.post("/webhook")
@limiter.limit("60/minute")
async def whatsapp_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receive messages from WhatsApp Cloud API."""
    print("!!! WHATSAPP WEBHOOK PING RECEIVED !!!")
    try:
        payload = await request.json()
        print(f"DEBUG: Incoming WhatsApp Payload: {payload}")
        
        entries = payload.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                messages = value.get("messages", [])
                metadata = value.get("metadata", {})
                phone_id = metadata.get("phone_number_id")
                
                if messages:
                    message = messages[0]
                    sender_phone = message.get("from")
                    msg_type = message.get("type")
                    text = None
                    
                    if msg_type == "text":
                        text = message.get("text", {}).get("body")
                    
                    # 1. Find integration by phone_id
                    result = await db.execute(
                        select(Integration).where(Integration.provider == 'whatsapp')
                    )
                    all_wa = result.scalars().all()
                    integration = next((i for i in all_wa if i.settings.get("phone_number_id") == phone_id), None)
                    
                    if not integration:
                        print(f"ERROR: WhatsApp Integration for phone_id {phone_id} not found.")
                        continue

                    # 2. Fetch business
                    result = await db.execute(
                        select(BusinessProfile)
                        .where(BusinessProfile.id == integration.business_id)
                        .options(selectinload(BusinessProfile.assistant_config))
                    )
                    business = result.scalars().first()
                    if not business:
                        print(f"ERROR: Business not found for WA integration {integration.id}")
                        continue

                    # Try to get profile name from contacts
                    contacts = value.get("contacts", [])
                    profile_name = contacts[0].get("profile", {}).get("name") if contacts else None
                    
                    if text:
                        # 1. Mark as Read immediately
                        try:
                            access_token = decrypt_token(integration.access_token)
                            read_url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
                            read_payload = {
                                "messaging_product": "whatsapp",
                                "status": "read",
                                "message_id": message.get("id")
                            }
                            async with httpx.AsyncClient() as http_client:
                                await http_client.post(read_url, json=read_payload, headers={"Authorization": f"Bearer {access_token}"})
                        except Exception as re:
                            print(f"DEBUG: WhatsApp mark-as-read failed: {re}")

                        from app.core.ai_service import AIService
                        ai = AIService(business, db)
                        
                        meta = {
                            "platform": "whatsapp",
                            "name": profile_name
                        }
                        
                        try:
                            response_text = await ai.get_response(sender_phone, text, meta)
                            print(f"DEBUG: AI success for WA {sender_phone}. Sending...")
                        except Exception as e:
                            print(f"ERROR: WA AIService failed: {e}")
                            traceback.print_exc()
                            response_text = "Lo siento, estoy teniendo problemas técnicos. Por favor, intenta de nuevo."
                        
                        # 3. Send back via WhatsApp (decrypted token)
                        import httpx
                        access_token = decrypt_token(integration.access_token)
                        url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
                        headers = {
                            "Authorization": f"Bearer {access_token}",
                            "Content-Type": "application/json"
                        }
                        wa_payload = {
                            "messaging_product": "whatsapp",
                            "to": sender_phone,
                            "type": "text",
                            "text": {"body": response_text}
                        }
                        
                        async with httpx.AsyncClient() as http_client:
                            wa_res = await http_client.post(url, json=wa_payload, headers=headers)
                            if wa_res.status_code >= 400:
                                print(f"ERROR: WhatsApp API returned {wa_res.status_code}: {wa_res.text}")
                            else:
                                print(f"DEBUG: Successfully sent WA reply to {sender_phone}")

        return {"status": "ok"}
    except Exception as e:
        print(f"CRITICAL: WhatsApp Webhook Entry Crash: {e}")
        traceback.print_exc()
        return {"status": "error"}

@router.post("/setup")
async def setup_whatsapp(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Save WhatsApp Cloud API credentials."""
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    access_token = data.get("access_token")
    phone_id = data.get("phone_number_id")
    
    if not access_token or not phone_id:
        raise HTTPException(status_code=400, detail="access_token and phone_number_id are required")

    result = await db.execute(
        select(Integration).where(Integration.business_id == business.id, Integration.provider == 'whatsapp')
    )
    integration = result.scalars().first()
    
    if not integration:
        integration = Integration(business_id=business.id, provider='whatsapp', settings={})
        db.add(integration)
    
    integration.access_token = encrypt_token(access_token)
    integration.settings = {
        "phone_number_id": phone_id,
        "business_account_id": data.get("business_account_id"),
        "verify_token": data.get("verify_token")
    }
    
    await db.commit()
    return {"status": "success"}
