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
                        .options(selectinload(BusinessProfile.agents))
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
    Unified Multi-tenant Twilio Webhook with Identity-based Routing.
    Returns 200 OK immediately and processes message asynchronously.
    """
    print("!!! TWILIO UNIFIED WEBHOOK PING RECEIVED !!!")
    try:
        form_data = await request.form()
        payload = dict(form_data)
        raw_sender = payload.get("From", "")
        raw_to = payload.get("To", "")
        text = payload.get("Body")
        profile_name = payload.get("ProfileName")

        import re
        def clean_num(n: str): return re.sub(r"\D", "", n)
        
        sender_phone = clean_num(raw_sender)
        to_phone = clean_num(raw_to)

        print(f"DEBUG: Normalized To={to_phone}, From={sender_phone}, Text='{text}'")

        if not text:
            return Response(content="<Response></Response>", media_type="text/xml")

        # 1. Find integration matching the destination phone number
        result = await db.execute(
            select(Integration).where(Integration.provider == 'whatsapp')
        )
        all_wa = result.scalars().all()
        
        integration = None
        for i in all_wa:
            int_phone = i.settings.get("phone_number", "") or i.settings.get("twilio_from_number", "")
            if int_phone:
                int_clean = clean_num(int_phone)
                if int_clean == to_phone:
                    integration = i
                    break
                    
        # Sandbox Fallback for local testing / platform config
        if not integration:
            master_number_raw = await ConfigService.get(db, "TWILIO_WHATSAPP_NUMBER", settings.TWILIO_WHATSAPP_NUMBER)
            master_number = clean_num(master_number_raw or "")
            if to_phone == master_number and all_wa:
                print("DEBUG: Using Sandbox fallback")
                integration = all_wa[0]

        if not integration:
            print(f"ERROR: Routing failed. Could not find business for number: {to_phone}")
            return Response(content="Sender registration unmapped.", status_code=404)

        # 2. Resolve credentials & validate Twilio request signature
        signature = request.headers.get("X-Twilio-Signature")
        
        provider_type = integration.settings.get("provider_type", "twilio_subaccount")
        if provider_type == "twilio_subaccount":
            from app.core.encryption import decrypt_value
            auth_token = decrypt_value(integration.settings.get("auth_token_encrypted"))
        else:
            auth_token = await ConfigService.get(db, "TWILIO_AUTH_TOKEN", settings.TWILIO_AUTH_TOKEN)
            
        import os
        is_testing = os.getenv("TESTING") == "true" or "sandbox" in raw_sender.lower()
        if auth_token and signature and not is_testing:
            from twilio.request_validator import RequestValidator
            validator = RequestValidator(auth_token)
            
            proto = request.headers.get("X-Forwarded-Proto", "https")
            host = request.headers.get("X-Forwarded-Host", request.headers.get("Host", "localhost"))
            url = f"{proto}://{host}{request.url.path}"
            
            if not validator.validate(url, payload, signature):
                print(f"WARNING: Invalid Twilio request signature validation failed! URL={url}")
                return Response(content="Forbidden: Invalid Signature", status_code=403)

        # 2. Fetch Business
        result = await db.execute(
            select(BusinessProfile)
            .where(BusinessProfile.id == integration.business_id)
            .options(selectinload(BusinessProfile.agents))
        )
        business = result.scalars().first()
        if not business:
            print(f"ERROR: Business record missing for ID {integration.business_id}")
            return Response(content="<Response></Response>", media_type="text/xml")

        print(f"DEBUG: Routing message to Business: '{business.name}'")

        # 3. Match identity
        from app.services.identity_resolver import IdentityResolver
        sender_type, client = await IdentityResolver.resolve_sender(db, business.id, sender_phone)

        # 4. Check dynamic routing and feature configuration flags
        from app.models.business import VerticalType
        is_trade = business.vertical_type == VerticalType.TRADE

        from app.api.business import get_default_features_config, get_default_routing_config
        vertical = business.vertical_type.value if hasattr(business.vertical_type, "value") else (business.vertical_type or "BASIC")
        feat_cfg = business.features_config or get_default_features_config(vertical)
        feature_enabled = True
        flow_enabled = False

        cfg = business.routing_config or get_default_routing_config(vertical)

        if sender_type == "customer":
            feature_enabled = feat_cfg.get("scheduling", {}).get("enabled", True)
            flow_enabled = cfg.get("prospective_clients", {}).get("enabled", True)
        elif sender_type == "prospective_client":
            feature_enabled = is_trade and feat_cfg.get("campaign_flow", {}).get("enabled", False)
            flow_enabled = is_trade and cfg.get("prospective_clients", {}).get("enabled", False)
        elif sender_type == "distributor_retailer":
            feature_enabled = is_trade and feat_cfg.get("b2b_solutions", {}).get("enabled", False)
            flow_enabled = is_trade and cfg.get("distributors_retailers", {}).get("enabled", False)
        elif sender_type == "sales_rep":
            feature_enabled = is_trade and feat_cfg.get("sales_intelligence", {}).get("enabled", False)
            flow_enabled = is_trade and cfg.get("sales_reps", {}).get("enabled", True)

        if not feature_enabled or not flow_enabled:
            from twilio.twiml.messaging_response import MessagingResponse
            twiml = MessagingResponse()
            twiml.message("Este servicio no está habilitado actualmente para este número.")
            return Response(content=str(twiml), media_type="text/xml")

        # 5. Dispatch to Celery queues
        from app.tasks.messages import (
            process_sales_rep_message, 
            process_distributor_message, 
            process_prospect_message,
            process_customer_message
        )
        
        if sender_type == "customer":
            client_id = client.id if client else None
            process_customer_message.apply_async(
                args=[business.id, client_id, payload], queue="prospects"
            )
        elif sender_type == "sales_rep":
            process_sales_rep_message.apply_async(
                args=[business.id, client.id, payload], queue="sales-reps"
            )
        elif sender_type == "distributor_retailer":
            process_distributor_message.apply_async(
                args=[business.id, client.id, payload], queue="distributors"
            )
        else:
            client_id = client.id if client else None
            process_prospect_message.apply_async(
                args=[business.id, client_id, payload], queue="prospects"
            )

        # Return 200 immediately to prevent Twilio timeout
        return Response(content="<Response></Response>", media_type="text/xml")

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

@router.get("/status")
async def get_whatsapp_status(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Get dynamic status and diagnostics for the WhatsApp/Twilio integration."""
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
        
    result = await db.execute(
        select(Integration).where(Integration.business_id == business.id, Integration.provider == 'whatsapp')
    )
    integration = result.scalars().first()
    
    if not integration:
        return {"status": "disconnected", "error_message": "No WhatsApp integration configured."}
        
    settings_dict = integration.settings or {}
    from_num = settings_dict.get("twilio_from_number")
    
    if not from_num:
        return {"status": "pending_verification", "error_message": "Configure un número de WhatsApp en la configuración de la integración."}
        
    # Active Connection Health Check
    provider_type = settings_dict.get("provider_type", "twilio_subaccount")
    if provider_type == "twilio_subaccount":
        account_sid = settings_dict.get("subaccount_sid")
        from app.core.encryption import decrypt_value
        auth_token = decrypt_value(settings_dict.get("auth_token_encrypted"))
    else:
        account_sid = await ConfigService.get(db, "TWILIO_ACCOUNT_SID", settings.TWILIO_ACCOUNT_SID)
        auth_token = await ConfigService.get(db, "TWILIO_AUTH_TOKEN", settings.TWILIO_AUTH_TOKEN)
        
    if not account_sid or not auth_token:
        return {
            "status": "error",
            "error_code": "credentials_missing",
            "error_message": "No se encontraron las credenciales de la plataforma Twilio (Account SID o Auth Token)."
        }
        
    from datetime import datetime
    try:
        from twilio.rest import Client
        # Direct API test validation
        client = Client(account_sid, auth_token)
        # Fetch account details to verify SID/token credentials validity
        client.api.v2010.accounts(account_sid).fetch()
        
        return {
            "status": "connected",
            "provider_type": settings_dict.get("provider_type", "twilio_platform"),
            "twilio_from_number": from_num,
            "is_sandbox": settings_dict.get("is_sandbox", False),
            "checked_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Twilio credential validation failed: {e}")
        return {
            "status": "error",
            "error_code": "twilio_auth_failed",
            "error_message": "Error de autenticación con la plataforma de Twilio: credentials check failed."
        }
