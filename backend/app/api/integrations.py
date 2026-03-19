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
            print(f"DEBUG: Using Client ID: {client_id[:5]}...{client_id[-3:]}")
            print(f"DEBUG: Using Client Secret: {client_secret[:3]}...{client_secret[-3:]}")
            print(f"DEBUG: Using Redirect URI: {redirect_uri}")

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
            print(f"DEBUG: Google Token Exchange Error: {token_data}")
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
        print("CRITICAL: Error in google_callback:")
        traceback.print_exc()
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
    
    busy_slots = await service.get_availability(start_time, end_time)
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
    
    # 1. Delete the integration record
    await db.execute(
        delete(Integration)
        .where(Integration.business_id == business.id, Integration.provider == provider)
    )
    
    # 2. If it's Google, also clear the busy slots cache
    if provider == 'google':
        await db.execute(
            delete(BusySlot)
            .where(BusySlot.business_id == business.id, BusySlot.source == 'google')
        )
    
    await db.commit()
    return {"status": "disconnected"}
