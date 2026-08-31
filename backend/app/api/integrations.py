"""
External Integrations & Auth Redirect Router.
Manages Google Calendar OAuth flow, token refresh/revocation, Twilio settings, and other API integrations.
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from google_auth_oauthlib.flow import Flow
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.integration import Integration
from app.models.calendar import BusySlot
from app.api.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
from app.core.google_calendar import GoogleCalendarService
from app.core.security import encrypt_token

router = APIRouter()

# MVP Scope: Read-only calendar availability + Create events
SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly', 
    'https://www.googleapis.com/auth/calendar.events',
    'openid', 
    'https://www.googleapis.com/auth/userinfo.email'
]

@router.get("/google/authorize")
async def authorize_google(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # Fetch from database instead of settings
    from app.core.system_config import ConfigService
    client_id = await ConfigService.get(db, "GOOGLE_CLIENT_ID")
    redirect_uri = await ConfigService.get(db, "GOOGLE_REDIRECT_URI", settings.GOOGLE_REDIRECT_URI)
    
    if not client_id:
        raise HTTPException(status_code=400, detail="Google Client ID not configured in Admin settings.")

    import urllib.parse
    base_url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
        "state": str(current_user.id)
    }
    
    authorization_url = f"{base_url}?{urllib.parse.urlencode(params)}"
    return {"authorization_url": authorization_url}

@router.get("/google/callback")
async def google_callback(
    request: Request,
    state: str,
    code: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    import httpx
    import traceback
    from app.core.system_config import ConfigService
    
    try:
        # Fetch credentials from database
        client_id = await ConfigService.get(db, "GOOGLE_CLIENT_ID")
        client_secret = await ConfigService.get(db, "GOOGLE_CLIENT_SECRET")
        redirect_uri = await ConfigService.get(db, "GOOGLE_REDIRECT_URI", settings.GOOGLE_REDIRECT_URI)

        if client_id and client_secret:
            logger.debug("Using Client ID: %s...%s", client_id[:5], client_id[-3:])
            logger.debug("Using Client Secret: %s...%s", client_secret[:3], client_secret[-3:])
            logger.debug("Using Redirect URI: %s", redirect_uri)

        if not client_id or not client_secret:
            raise HTTPException(status_code=400, detail="Google credentials not found in database.")

        # 1. Manual token exchange
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)
            token_data = response.json()
        
        if "error" in token_data:
            logger.debug("Google Token Exchange Error: %s", token_data)
            raise HTTPException(status_code=400, detail=f"Google Error: {token_data.get('error_description', token_data['error'])}")

        # 2. Extract tokens
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in")
        token_expiry = datetime.utcnow() + timedelta(seconds=expires_in) if expires_in else None

        # 3. Link to Business Profile (state is our user_id)
        user_id = state
        result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
        business = result.scalars().first()
        if not business:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # 4. Upsert Integration (with encryption)
        result = await db.execute(
            select(Integration)
            .where(Integration.business_id == business.id, Integration.provider == 'google')
        )
        integration = result.scalars().first()
        
        if not integration:
            integration = Integration(business_id=business.id, provider='google')
            db.add(integration)
        
        integration.access_token = encrypt_token(access_token)
        if refresh_token: # Google only sends this on the first consent
            integration.refresh_token = encrypt_token(refresh_token)
        integration.token_expiry = token_expiry
        
        await db.commit()
        
        # Fetch FRONTEND_URL from database
        base_frontend = await ConfigService.get(db, "FRONTEND_URL", "https://web-staging-794a.up.railway.app")
        # Ensure no trailing slash
        base_frontend = base_frontend.rstrip("/")
        
        return RedirectResponse(url=f"{base_frontend}/integrations/google/success")
        
    except Exception as e:
        logger.critical("Error in google_callback", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/google/availability")
async def get_google_availability(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Fetch availability for the current user's business."""
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == current_user.id)
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    result = await db.execute(
        select(Integration)
        .where(Integration.business_id == business.id, Integration.provider == 'google')
    )
    integration = result.scalars().first()
    if not integration:
        raise HTTPException(status_code=400, detail="Google integration not found")
    
    service = GoogleCalendarService(integration, db)
    
    # Check next 7 days by default
    start_time = datetime.utcnow()
    end_time = start_time + timedelta(days=7)
    
    # Use list_events instead of get_availability to get event IDs for deduplication
    events = await service.list_events(start_time, end_time)
    busy_slots = []
    for e in events:
        summary = e.get('summary', 'Busy')
        # Skip events created by Sherpa itself to prevent duplication
        if summary.startswith("Sherpa:"):
            continue
            
        busy_slots.append({
            "start": e.get('start', {}).get('dateTime') or e.get('start', {}).get('date'),
            "end": e.get('end', {}).get('dateTime') or e.get('end', {}).get('date'),
            "id": e.get('id'),
            "summary": summary
        })
        
    return {"busy_slots": busy_slots}

@router.post("/google/sync")
async def trigger_google_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Manually trigger a calendar sync task."""
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == current_user.id)
    )
    business = result.scalars().first()
    
    result = await db.execute(
        select(Integration)
        .where(Integration.business_id == business.id, Integration.provider == 'google')
    )
    integration = result.scalars().first()
    if not integration:
        raise HTTPException(status_code=400, detail="Google integration not found")
    
    from app.tasks.calendar_sync import sync_single_calendar
    sync_single_calendar.delay(integration.id)
    
    return {"status": "sync_triggered"}

@router.post("/whatsapp/provision")
async def provision_whatsapp(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Automate Twilio subaccount and MX number provisioning for this business."""
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == current_user.id)
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
        
    area_code = data.get("area_code")
    friendly_name = data.get("friendly_name") or f"{business.name} WhatsApp"
    
    from app.services.messaging.provisioner import provision_whatsapp_sender
    try:
        integration = await provision_whatsapp_sender(
            db=db,
            business_id=business.id,
            friendly_name=friendly_name,
            area_code=area_code
        )
        return {
            "status": "success",
            "phone_number": integration.settings.get("phone_number"),
            "provider_type": "twilio_subaccount"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/whatsapp/config")
async def get_whatsapp_config(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get public configuration for Meta WhatsApp onboarding."""
    prefill = {}
    if current_user.business_profile:
        bp = current_user.business_profile
        if bp.name:
            prefill["business_name"] = bp.name
        if bp.category:
            prefill["category"] = bp.category

    return {
        "app_id": settings.META_APP_ID,
        "config_id": settings.META_EMBEDDED_SIGNUP_CONFIG_ID,
        "prefill": prefill
    }

@router.post("/whatsapp/meta-onboard")
async def meta_onboard_whatsapp(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Onboards a client's WhatsApp Business Account using Meta Cloud API.
    Can be called with:
      Option A (Embedded Signup Code):
        - code: str (OAuth authorization code from Meta login)
      Option B (Manual Input / Sandbox):
        - phone_number_id: str
        - waba_id: str
        - display_phone_number: str
    """
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == current_user.id)
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    phone_number_id = data.get("phone_number_id")
    waba_id = data.get("waba_id")
    display_phone_number = data.get("display_phone_number")
    code = data.get("code")

    import httpx
    version = settings.META_GRAPH_API_VERSION or "v22.0"

    # Option A: Automatic resolution using OAuth authorization code
    if code:
        if not settings.META_APP_ID or not settings.META_APP_SECRET:
            raise HTTPException(
                status_code=500,
                detail="META_APP_ID and META_APP_SECRET are not configured on the server."
            )
        
        try:
            async with httpx.AsyncClient() as client:
                token_res = await client.get(
                    f"https://graph.facebook.com/{version}/oauth/access_token",
                    params={
                        "client_id": settings.META_APP_ID,
                        "client_secret": settings.META_APP_SECRET,
                        "code": code
                    },
                    timeout=15.0
                )
                if token_res.status_code >= 400:
                    logger.error("Failed to exchange code: %s", token_res.text)
                    raise HTTPException(status_code=400, detail=f"Code exchange failed: {token_res.text}")
                
                client_token = token_res.json().get("access_token")
                
                # If waba_id was not passed directly in request payload, discover it
                if not waba_id:
                    # Method 1: /debug_token to inspect granular_scopes
                    app_access_token = f"{settings.META_APP_ID}|{settings.META_APP_SECRET}"
                    debug_res = await client.get(
                        f"https://graph.facebook.com/{version}/debug_token",
                        params={
                            "input_token": client_token,
                            "access_token": app_access_token
                        },
                        timeout=15.0
                    )
                    if debug_res.status_code == 200:
                        debug_data = debug_res.json().get("data", {})
                        granular_scopes = debug_data.get("granular_scopes", [])
                        for scope_item in granular_scopes:
                            if scope_item.get("scope") in ["whatsapp_business_management", "whatsapp_business_messaging"]:
                                target_ids = scope_item.get("target_ids", [])
                                if target_ids:
                                    waba_id = str(target_ids[0])
                                    logger.info("Discovered WABA ID %s from debug_token granular_scopes", waba_id)
                                    break
                    else:
                        logger.warning("debug_token call failed: %s", debug_res.text)

                    # Method 2: Fallback via /me/businesses
                    if not waba_id:
                        biz_res = await client.get(
                            f"https://graph.facebook.com/{version}/me/businesses",
                            headers={"Authorization": f"Bearer {client_token}"},
                            timeout=15.0
                        )
                        if biz_res.status_code == 200:
                            for biz in biz_res.json().get("data", []):
                                biz_id = biz.get("id")
                                for edge in ["client_whatsapp_business_accounts", "owned_whatsapp_business_accounts"]:
                                    w_res = await client.get(
                                        f"https://graph.facebook.com/{version}/{biz_id}/{edge}",
                                        headers={"Authorization": f"Bearer {client_token}"},
                                        timeout=15.0
                                    )
                                    if w_res.status_code == 200 and w_res.json().get("data"):
                                        waba_id = str(w_res.json()["data"][0]["id"])
                                        logger.info("Discovered WABA ID %s from business %s %s", waba_id, biz_id, edge)
                                        break
                                if waba_id:
                                    break

                if not waba_id:
                    logger.error("Could not discover WABA ID from token exchange.")
                    raise HTTPException(
                        status_code=400,
                        detail="Could not retrieve WhatsApp Business Account from Meta. Please ensure permissions were granted in the popup."
                    )
                
                # Fetch phone numbers for this WABA if phone_number_id or display_phone_number is missing
                if not phone_number_id or not display_phone_number:
                    # Try client_token first, then system_user_token
                    phone_res = await client.get(
                        f"https://graph.facebook.com/{version}/{waba_id}/phone_numbers",
                        headers={"Authorization": f"Bearer {client_token}"},
                        timeout=15.0
                    )
                    if (phone_res.status_code >= 400 or not phone_res.json().get("data")) and settings.META_SYSTEM_USER_TOKEN:
                        phone_res = await client.get(
                            f"https://graph.facebook.com/{version}/{waba_id}/phone_numbers",
                            headers={"Authorization": f"Bearer {settings.META_SYSTEM_USER_TOKEN}"},
                            timeout=15.0
                        )

                    if phone_res.status_code >= 400 or not phone_res.json().get("data"):
                        logger.error("Failed to fetch phone numbers for WABA %s: %s", waba_id, phone_res.text)
                        raise HTTPException(
                            status_code=400,
                            detail=f"Could not retrieve phone numbers for WABA {waba_id} from Meta."
                        )
                    
                    phone_data = phone_res.json()["data"][0]
                    phone_number_id = str(phone_data["id"])
                    display_phone_number = phone_data.get("display_phone_number") or phone_data.get("verified_name") or phone_number_id
                
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Meta API resolution error during onboarding")
            raise HTTPException(status_code=500, detail=f"Failed to auto-resolve Meta account details: {str(e)}")

    if not phone_number_id or not waba_id or not display_phone_number:
        raise HTTPException(
            status_code=400, 
            detail="Missing required fields: phone_number_id, waba_id, display_phone_number"
        )
        
    import re
    clean_phone = re.sub(r"\D", "", display_phone_number)
    if not clean_phone.startswith("+"):
        clean_phone = f"+{clean_phone}"

    if not settings.META_SYSTEM_USER_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="META_SYSTEM_USER_TOKEN is not configured on the server."
        )

    access_token_encrypted = encrypt_token(settings.META_SYSTEM_USER_TOKEN)

    int_result = await db.execute(
        select(Integration)
        .where(Integration.business_id == business.id, Integration.provider == "whatsapp")
    )
    integration = int_result.scalars().first()
    
    if not integration:
        integration = Integration(
            business_id=business.id,
            provider="whatsapp",
            access_token=access_token_encrypted,
            settings={
                "provider_type": "meta_cloud_api",
                "phone_number_id": phone_number_id,
                "waba_id": waba_id,
                "phone_number": clean_phone,
                "default_template_name": "hello_communication",
                "default_template_lang": "es"
            }
        )
        db.add(integration)
    else:
        integration.access_token = access_token_encrypted
        integration.settings = {
            **integration.settings,
            "provider_type": "meta_cloud_api",
            "phone_number_id": phone_number_id,
            "waba_id": waba_id,
            "phone_number": clean_phone
        }
        
    await db.commit()
    await db.refresh(integration)
    
    # Auto-register phone on Meta Cloud API and subscribe WABA to webhooks
    # This is the inverse of the /deregister call made during disconnect
    reg_status = "skipped"
    reg_detail = ""
    sub_status = "skipped"
    sub_detail = ""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            # 1. Register phone number with Cloud API (activates "Conectado" status)
            reg_res = await http_client.post(
                f"https://graph.facebook.com/{version}/{phone_number_id}/register",
                headers={"Authorization": f"Bearer {settings.META_SYSTEM_USER_TOKEN}"},
                json={"messaging_product": "whatsapp", "pin": "123456"}
            )
            reg_detail = reg_res.text
            if reg_res.status_code < 400:
                reg_status = "success"
                logger.info("Meta /register success for %s: %s", phone_number_id, reg_detail)
            else:
                reg_status = f"error:{reg_res.status_code}"
                logger.error("Meta /register failed for %s (status %s): %s", phone_number_id, reg_res.status_code, reg_detail)

            # 2. Subscribe WABA to app webhooks (enables message reception)
            sub_res = await http_client.post(
                f"https://graph.facebook.com/{version}/{waba_id}/subscribed_apps",
                headers={"Authorization": f"Bearer {settings.META_SYSTEM_USER_TOKEN}"},
                json={"subscribed_fields": ["messages"]}
            )
            sub_detail = sub_res.text
            if sub_res.status_code < 400:
                sub_status = "success"
                logger.info("Meta /subscribed_apps success for %s: %s", waba_id, sub_detail)
            else:
                sub_status = f"error:{sub_res.status_code}"
                logger.error("Meta /subscribed_apps failed for %s (status %s): %s", waba_id, sub_res.status_code, sub_detail)
    except Exception as reg_err:
        logger.error("Meta auto-registration during onboarding exception: %s", reg_err)
        reg_status = f"exception:{reg_err}"
        reg_detail = str(reg_err)

    logger.info(
        "Meta WhatsApp onboarding completed for business %s: WABA=%s, phone_id=%s, phone=%s, register=%s, subscribe=%s",
        business.id, waba_id, phone_number_id, clean_phone, reg_status, sub_status
    )
    
    return {
        "status": "success",
        "phone_number": clean_phone,
        "provider_type": "meta_cloud_api",
        "meta_register": reg_status,
        "meta_register_detail": reg_detail,
        "meta_subscribe": sub_status,
        "meta_subscribe_detail": sub_detail
    }

@router.delete("/{provider}")
async def disconnect_integration(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Remove an integration and its associated local cache."""
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == current_user.id)
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    # 1. Fetch integration first to check settings
    result = await db.execute(
        select(Integration)
        .where(Integration.business_id == business.id, Integration.provider == provider)
    )
    integration = result.scalars().first()
    
    if integration:
        if provider == 'whatsapp':
            from app.services.messaging.provisioner import release_whatsapp_sender
            try:
                await release_whatsapp_sender(integration.settings or {}, integration.access_token)
            except Exception as release_err:
                logger.error("Failed to release whatsapp integration: %s", release_err)
        elif provider == 'telegram':
            try:
                from app.core.security import decrypt_token
                import httpx
                token = decrypt_token(integration.access_token)
                async with httpx.AsyncClient() as http_client:
                    await http_client.get(f"https://api.telegram.org/bot{token}/deleteWebhook", params={"drop_pending_updates": True})
            except Exception as release_err:
                logger.error("Failed to delete telegram webhook on disconnect: %s", release_err)
                
        # Delete the integration record
        await db.execute(
            delete(Integration)
            .where(Integration.id == integration.id)
        )
    
    # 2. If it's Google, also clear the busy slots cache
    if provider == 'google':
        await db.execute(
            delete(BusySlot)
            .where(BusySlot.business_id == business.id, BusySlot.source == 'google')
        )
    
    await db.commit()
    return {"status": "disconnected"}


@router.get("/whatsapp/usage/{business_id}")
async def get_whatsapp_usage_endpoint(
    business_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get monthly message usage statistics for WhatsApp integration."""
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.id == business_id)
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
        
    if business.user_id != current_user.id and current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to access usage data for this business.")
        
    from app.core.limiter import get_whatsapp_usage
    used = await get_whatsapp_usage(business_id)
    free_limit = 200
    purchased = business.purchased_credits
    total_limit = free_limit + purchased
    remaining = max(total_limit - used, 0)
    percent_used = min(float(used) / float(total_limit) * 100.0 if total_limit > 0 else 0.0, 100.0)
    
    return {
        "used": used,
        "free_limit": free_limit,
        "purchased": purchased,
        "total_limit": total_limit,
        "remaining": remaining,
        "percent_used": round(percent_used, 1)
    }

