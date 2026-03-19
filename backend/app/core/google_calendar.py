import httpx
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.integration import Integration
from app.core.config import settings
from app.core.security import decrypt_token, encrypt_token
from app.core.system_config import ConfigService

class GoogleCalendarService:
    BASE_URL = "https://www.googleapis.com/calendar/v3"

    def __init__(self, integration: Integration, db: AsyncSession):
        self.integration = integration
        self.db = db

    async def _get_access_token(self) -> str:
        """Get a valid access token, refreshing if necessary."""
        # Check if current token is expired (with 1-minute buffer)
        if self.integration.token_expiry and datetime.utcnow() < (self.integration.token_expiry - timedelta(minutes=1)):
            return decrypt_token(self.integration.access_token)

        # Refresh token
        client_id = await ConfigService.get(self.db, "GOOGLE_CLIENT_ID")
        client_secret = await ConfigService.get(self.db, "GOOGLE_CLIENT_SECRET")
        refresh_token = decrypt_token(self.integration.refresh_token)

        if not client_id or not client_secret:
            raise Exception("Google credentials not configured in Admin Panel")

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                }
            )
            
            if resp.status_code != 200:
                print(f"ERROR: Google Token Refresh Failed: {resp.text}")
                raise Exception(f"Failed to refresh Google token: {resp.text}")

            data = resp.json()
            new_access_token = data["access_token"]
            expires_in = data.get("expires_in", 3600)
            
            # Update in DB
            self.integration.access_token = encrypt_token(new_access_token)
            self.integration.token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
            self.db.add(self.integration)
            await self.db.commit()
            
            return new_access_token

    async def get_availability(self, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        """Fetch free/busy information for the primary calendar."""
        token = await self._get_access_token()
        
        url = f"https://www.googleapis.com/calendar/v3/freeBusy"
        body = {
            "timeMin": start_time.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            "timeMax": end_time.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            "items": [{"id": "primary"}]
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                json=body,
                headers={"Authorization": f"Bearer {token}"}
            )
            resp.raise_for_status()
            data = resp.json()
            
        busy_slots = data.get('calendars', {}).get('primary', {}).get('busy', [])
        return busy_slots

    async def list_events(self, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        """List actual events from the primary calendar."""
        token = await self._get_access_token()
        
        url = f"{self.BASE_URL}/calendars/primary/events"
        params = {
            "timeMin": start_time.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            "timeMax": end_time.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            "singleEvents": "true",
            "orderBy": "startTime"
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {token}"}
            )
            resp.raise_for_status()
            data = resp.json()
            
        return data.get('items', [])

    async def create_event(self, summary: str, start_time: datetime, end_time: datetime, description: str = ""):
        """Create an event in the primary Google calendar."""
        token = await self._get_access_token()
        
        url = f"{self.BASE_URL}/calendars/primary/events"
        body = {
            'summary': summary,
            'description': description,
            'start': {
                'dateTime': start_time.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            },
            'end': {
                'dateTime': end_time.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            },
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                json=body,
                headers={"Authorization": f"Bearer {token}"}
            )
            resp.raise_for_status()
            data = resp.json()
            
        return data.get('id')

    async def update_event(self, event_id: str, summary: str, start_time: datetime, end_time: datetime, description: str = ""):
        """Update an existing event in Google Calendar."""
        token = await self._get_access_token()
        
        url = f"{self.BASE_URL}/calendars/primary/events/{event_id}"
        body = {
            'summary': summary,
            'description': description,
            'start': {
                'dateTime': start_time.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            },
            'end': {
                'dateTime': end_time.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            },
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.put(
                url,
                json=body,
                headers={"Authorization": f"Bearer {token}"}
            )
            resp.raise_for_status()

    async def delete_event(self, event_id: str):
        """Delete an event from Google Calendar."""
        token = await self._get_access_token()
        
        url = f"{self.BASE_URL}/calendars/primary/events/{event_id}"
        
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                url,
                headers={"Authorization": f"Bearer {token}"}
            )
            if resp.status_code == 404:
                print(f"DEBUG: Google event {event_id} not found or already deleted.")
                return
            resp.raise_for_status()
