from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import json

from app.core.database import get_db
from app.core.config import settings
from app.models.business import BusinessProfile
from app.models.integration import Integration
from app.api.auth import get_current_user
from app.core.security import encrypt_token, decrypt_token

router = APIRouter()

@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    if hub_mode == "subscribe" and hub_challenge:
        return Response(content=hub_challenge, media_type="text/plain")
    return Response(content="Verification failed", status_code=403)

@router.post("/webhook")
async def handle_whatsapp_message(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    payload = await request.json()
    try:
        entries = payload.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                messages = value.get("messages", [])
                metadata = value.get("metadata", {})
                phone_id = metadata.get("phone_number_id")
                
                if messages and phone_id:
                    # Find business by phone_id
                    result = await db.execute(
                        select(Integration).where(
                            Integration.provider == 'whatsapp',
                            Integration.settings['phone_number_id'].astext == phone_id
                        )
                    )
                    integration = result.scalars().first()
                    if not integration: continue

                    # Eager load assistant_config
                    from sqlalchemy.orm import selectinload
                    result = await db.execute(
                        select(BusinessProfile)
                        .where(BusinessProfile.id == integration.business_id)
                        .options(selectinload(BusinessProfile.assistant_config))
                    )
                    business = result.scalars().first()

                    msg = messages[0]
                    sender_phone = msg.get("from")
                    text = msg.get("text", {}).get("body")
                    
                    # Try to get profile name from contacts
                    contacts = value.get("contacts", [])
                    profile_name = contacts[0].get("profile", {}).get("name") if contacts else None
                    
                    if text:
                        from app.core.ai_service import AIService
                        ai = AIService(business, db)
                        
                        meta = {
                            "platform": "whatsapp",
                            "name": profile_name
                        }
                            
                        response_text = await ai.get_response(sender_phone, text, meta)
                        
                        # Send back via WhatsApp (decrypted token)
                        import httpx
                        access_token = decrypt_token(integration.access_token)
                        url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
                        headers = {"Authorization": f"Bearer {access_token}"}
                        body = {
                            "messaging_product": "whatsapp",
                            "to": sender_phone,
                            "type": "text",
                            "text": {"body": response_text}
                        }
                        async with httpx.AsyncClient() as client:
                            await client.post(url, json=body, headers=headers)
                    
    except Exception as e:
        print(f"Error processing WhatsApp webhook: {str(e)}")
        
    return {"status": "received"}

@router.post("/link")
async def link_whatsapp(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    
    phone_id = data.get("phone_number_id")
    if not phone_id:
        raise HTTPException(status_code=400, detail="phone_number_id is required")

    # 1. Uniqueness check
    existing_phone = await db.execute(
        select(Integration).where(
            Integration.provider == 'whatsapp',
            Integration.settings['phone_number_id'].astext == phone_id,
            Integration.business_id != business.id
        )
    )
    if existing_phone.scalars().first():
        raise HTTPException(status_code=400, detail="This WhatsApp number is already connected.")

    # 2. Upsert Integration (with encryption)
    result = await db.execute(
        select(Integration)
        .where(Integration.business_id == business.id, Integration.provider == 'whatsapp')
    )
    integration = result.scalars().first()
    
    if not integration:
        integration = Integration(business_id=business.id, provider='whatsapp')
        db.add(integration)
    
    integration.access_token = encrypt_token(data.get("access_token"))
    integration.settings = {
        "phone_number_id": phone_id,
        "business_account_id": data.get("business_account_id"),
        "verify_token": data.get("verify_token")
    }
    
    await db.commit()
    return {"status": "success"}
