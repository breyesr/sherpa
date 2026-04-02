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
from app.core.system_config import ConfigService

router = APIRouter()

@router.get("/webhook")
async def verify_whatsapp(
    request: Request,
    db: AsyncSession = Depends(get_db),
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge")
):
    """WhatsApp Cloud API Webhook verification."""
    print(f"!!! WA VERIFY ATTEMPT: mode={hub_mode}, token={hub_verify_token} !!!")
    
    # Get dynamic verify token from Admin Settings
    expected_token = await ConfigService.get(db, "WHATSAPP_VERIFY_TOKEN", "sherpa_v1")
    
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        print("WA VERIFY SUCCESS")
        return Response(content=hub_challenge)
    
    print("WA VERIFY FAILED")
    return Response(content="Verification failed", status_code=403)

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

@router.api_route("/debug/twilio", methods=["GET", "POST"])
async def debug_twilio(request: Request):
    """Simple endpoint to verify Twilio is actually reaching the server."""
    print(f"!!! DEBUG TWILIO REACHED: Method={request.method} !!!")
    return {"status": "ok", "message": "Twilio can reach Sherpa!"}

@router.post("/webhook/twilio")
@limiter.limit("60/minute")
async def twilio_whatsapp_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Multi-tenant Twilio Webhook (ISV Platform Model).
    """
    print("!!! TWILIO PLATFORM WEBHOOK PING RECEIVED !!!")
    try:
        form_data = await request.form()
        payload = dict(form_data)
        
        sender_phone = payload.get("From", "").replace("whatsapp:", "")
        to_phone = payload.get("To", "").replace("whatsapp:", "")
        text = payload.get("Body")
        profile_name = payload.get("ProfileName")

        if not text:
            return Response(content="<Response></Response>", media_type="text/xml")

        # LOGIC FOR MULTI-TENANCY:
        # 1. In Production: Each business has its own 'To' number.
        # 2. In Sandbox: All businesses share the same 'To' number.
        
        # Search for integration by the business's registered WhatsApp number
        # For Sandbox testing, we'll try to find if the sender_phone is already associated with a client 
        # but that's for messages. For the FIRST connection, we need a mapping.
        
        result = await db.execute(
            select(Integration).where(Integration.provider == 'whatsapp')
        )
        all_wa = result.scalars().all()
        
        # Strategy A: Match by 'To' number (Production / Specific Senders)
        integration = next((i for i in all_wa if i.settings.get("twilio_from_number") == to_phone), None)
        
        # Strategy B: Sandbox Fallback (If To is the global sandbox number, we need to know which business to route to)
        master_number = await ConfigService.get(db, "TWILIO_WHATSAPP_NUMBER", settings.TWILIO_WHATSAPP_NUMBER)
        if not integration and to_phone == master_number:
            if len(all_wa) > 0:
                integration = all_wa[0] # Test fallback

        if not integration:
            print(f"ERROR: Routing failed for {to_phone}. Register this number in Sherpa first.")
            return Response(content="<Response></Response>", media_type="text/xml")

        # Fetch the Business
        result = await db.execute(
            select(BusinessProfile)
            .where(BusinessProfile.id == integration.business_id)
            .options(selectinload(BusinessProfile.assistant_config))
        )
        business = result.scalars().first()
        
        from app.core.ai_service import AIService
        ai = AIService(business, db)
        response_text = await ai.get_response(sender_phone, text, {"platform": "whatsapp", "name": profile_name})

        from twilio.twiml.messaging_response import MessagingResponse
        twiml = MessagingResponse()
        twiml.message(response_text)
        return Response(content=str(twiml), media_type="text/xml")

    except Exception as e:
        print(f"CRITICAL: Twilio Webhook Error: {e}")
        return Response(content="<Response></Response>", media_type="text/xml")

@router.post("/setup")
async def setup_whatsapp(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Simplified Setup (Option B): Users only provide their number.
    The Platform's master keys are used automatically.
    """
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if not business: raise HTTPException(status_code=404, detail="Business not found")

    # In Option B, the user only provides their registered business number
    business_number = data.get("business_number")
    if not business_number:
        raise HTTPException(status_code=400, detail="Business WhatsApp number is required")

    result = await db.execute(
        select(Integration).where(Integration.business_id == business.id, Integration.provider == 'whatsapp')
    )
    integration = result.scalars().first()
    
    if not integration:
        integration = Integration(business_id=business.id, provider='whatsapp')
        db.add(integration)

    # Use Platform keys (no longer storing them per user in the DB)
    master_number = await ConfigService.get(db, "TWILIO_WHATSAPP_NUMBER", settings.TWILIO_WHATSAPP_NUMBER)
    integration.settings = {
        "provider_type": "twilio_platform",
        "twilio_from_number": business_number.replace("whatsapp:", "").strip(),
        "is_sandbox": business_number.replace("whatsapp:", "").strip() == master_number
    }
    
    await db.commit()
    return {"status": "success"}
