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
        
        # Raw numbers from Twilio
        raw_sender = payload.get("From", "")
        raw_to = payload.get("To", "")
        text = payload.get("Body")
        profile_name = payload.get("ProfileName")

        # Normalize: strip 'whatsapp:', '+', spaces, etc.
        import re
        def clean_num(n: str): return re.sub(r"\D", "", n)
        
        sender_phone = clean_num(raw_sender)
        to_phone = clean_num(raw_to)

        print(f"DEBUG: Normalized To={to_phone}, From={sender_phone}, Text='{text}'")

        if not text:
            return Response(content="<Response></Response>", media_type="text/xml")

        # 1. Find integration
        result = await db.execute(
            select(Integration).where(Integration.provider == 'whatsapp')
        )
        all_wa = result.scalars().all()
        
        # Log available numbers for debugging
        registered_numbers = [clean_num(i.settings.get("twilio_from_number", "")) for i in all_wa]
        print(f"DEBUG: Registered business numbers in DB: {registered_numbers}")

        integration = next((i for i in all_wa if clean_num(i.settings.get("twilio_from_number", "")) == to_phone), None)
        
        # Strategy B: Sandbox Fallback
        master_number_raw = await ConfigService.get(db, "TWILIO_WHATSAPP_NUMBER", settings.TWILIO_WHATSAPP_NUMBER)
        master_number = clean_num(master_number_raw or "")
        
        if not integration and to_phone == master_number:
            print("DEBUG: Using Sandbox fallback (Match with Master Number)")
            if len(all_wa) > 0:
                integration = all_wa[0]

        if not integration:
            print(f"ERROR: Routing failed. Could not find business for number: {to_phone}")
            return Response(content="<Response></Response>", media_type="text/xml")

        # 2. Fetch Business
        result = await db.execute(
            select(BusinessProfile)
            .where(BusinessProfile.id == integration.business_id)
            .options(selectinload(BusinessProfile.assistant_config))
        )
        business = result.scalars().first()
        if not business:
            print(f"ERROR: Business record missing for ID {integration.business_id}")
            return Response(content="<Response></Response>", media_type="text/xml")

        print(f"DEBUG: Routing message to Business: '{business.name}'")

        # 3. Get AI Response
        from app.core.ai_service import AIService
        ai = AIService(business, db)
        
        try:
            response_text = await ai.get_response(sender_phone, text, {"platform": "whatsapp", "name": profile_name})
            print(f"DEBUG: AI Response success: '{response_text[:50]}...'")
        except Exception as ai_err:
            print(f"ERROR: AI Service crash: {ai_err}")
            traceback.print_exc()
            response_text = "Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías repetir?"

        # 4. Reply via TwiML
        from twilio.twiml.messaging_response import MessagingResponse
        twiml = MessagingResponse()
        twiml.message(response_text)
        return Response(content=str(twiml), media_type="text/xml")

    except Exception as e:
        print(f"CRITICAL: Twilio Webhook Top-level Crash: {e}")
        traceback.print_exc()
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
