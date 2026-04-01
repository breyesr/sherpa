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

@router.post("/webhook/twilio")
@limiter.limit("60/minute")
async def twilio_whatsapp_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Multi-tenant Twilio Webhook.
    Identifies the business by the 'To' number and routes to the correct AIService.
    """
    print("!!! TWILIO WHATSAPP WEBHOOK PING RECEIVED !!!")
    try:
        # Twilio sends data as Form URL Encoded
        form_data = await request.form()
        payload = dict(form_data)
        print(f"DEBUG: Incoming Twilio Payload: {payload}")
        
        # Twilio phone numbers come as 'whatsapp:+123456789'
        sender_phone = payload.get("From", "").replace("whatsapp:", "")
        to_phone = payload.get("To", "").replace("whatsapp:", "")
        text = payload.get("Body")
        profile_name = payload.get("ProfileName")

        if not text:
            return Response(content="<Response></Response>", media_type="text/xml")

        # 1. Multi-Tenant Lookup: Find integration by Twilio 'To' number
        # We search in the settings JSON for the twilio_from_number
        result = await db.execute(
            select(Integration).where(
                Integration.provider == 'whatsapp'
            )
        )
        all_wa = result.scalars().all()
        
        # Identify the specific tenant
        integration = next((i for i in all_wa if i.settings.get("twilio_from_number") == to_phone), None)
        
        # Fallback for initial Sandbox testing if only one integration exists
        if not integration and len(all_wa) == 1:
            integration = all_wa[0]

        if not integration:
            print(f"ERROR: No business found for Twilio number {to_phone}. Dropping message.")
            return Response(content="<Response></Response>", media_type="text/xml")

        # 2. Fetch the Business and its AI Configuration
        result = await db.execute(
            select(BusinessProfile)
            .where(BusinessProfile.id == integration.business_id)
            .options(selectinload(BusinessProfile.assistant_config))
        )
        business = result.scalars().first()
        if not business:
            print(f"ERROR: Business profile missing for integration {integration.id}")
            return Response(content="<Response></Response>", media_type="text/xml")

        # 3. Process with AI Service
        from app.core.ai_service import AIService
        ai = AIService(business, db)
        
        meta = {
            "platform": "whatsapp",
            "name": profile_name
        }
        
        try:
            response_text = await ai.get_response(sender_phone, text, meta)
        except Exception as e:
            print(f"ERROR: AI Processing failed for Twilio: {e}")
            traceback.print_exc()
            response_text = "Lo siento, estamos experimentando una falla técnica. Por favor intenta más tarde."

        # 4. Reply via Twilio TwiML (The required XML response)
        from twilio.twiml.messaging_response import MessagingResponse
        twiml = MessagingResponse()
        twiml.message(response_text)
        
        return Response(content=str(twiml), media_type="text/xml")

    except Exception as e:
        print(f"CRITICAL: Twilio Webhook Crash: {e}")
        traceback.print_exc()
        return Response(content="<Response></Response>", media_type="text/xml")

@router.post("/setup")
async def setup_whatsapp(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Unified Setup: Supports both WhatsApp Cloud API and Twilio.
    This flexibility is key for the "One-Click" future.
    """
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    provider_type = data.get("provider_type", "cloud_api") 
    
    result = await db.execute(
        select(Integration).where(Integration.business_id == business.id, Integration.provider == 'whatsapp')
    )
    integration = result.scalars().first()
    
    if not integration:
        integration = Integration(business_id=business.id, provider='whatsapp', settings={})
        db.add(integration)

    if provider_type == "twilio":
        account_sid = data.get("account_sid")
        auth_token = data.get("auth_token")
        from_number = data.get("from_number") 
        
        if not account_sid or not auth_token or not from_number:
            raise HTTPException(status_code=400, detail="Twilio requires Account SID, Auth Token, and From Number")
        
        integration.access_token = encrypt_token(auth_token)
        integration.settings = {
            "provider_type": "twilio",
            "twilio_account_sid": account_sid,
            "twilio_from_number": from_number.replace("whatsapp:", "").strip()
        }
    else:
        # Standard WhatsApp Cloud API
        access_token = data.get("access_token")
        phone_id = data.get("phone_number_id")
        
        if not access_token or not phone_id:
            raise HTTPException(status_code=400, detail="Cloud API requires Access Token and Phone ID")

        integration.access_token = encrypt_token(access_token)
        integration.settings = {
            "provider_type": "cloud_api",
            "phone_number_product_id": phone_id,
            "business_account_id": data.get("business_account_id"),
            "verify_token": data.get("verify_token")
        }
    
    await db.commit()
    return {"status": "success"}
