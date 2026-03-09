from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.integration import Integration
from app.core.config import settings
from app.core.security import decrypt_token, encrypt_token
from app.core.system_config import ConfigService

class GoogleCalendarService:
    def __init__(self, integration: Integration, db: AsyncSession):
        self.integration = integration
        self.db = db

    async def _get_credentials(self) -> Credentials:
        client_id = await ConfigService.get(self.db, "GOOGLE_CLIENT_ID")
        client_secret = await ConfigService.get(self.db, "GOOGLE_CLIENT_SECRET")
        
        if not client_id or not client_secret:
            raise Exception("Google credentials not configured in Admin Panel")

        return Credentials(
            token=decrypt_token(self.integration.access_token),
            refresh_token=decrypt_token(self.integration.refresh_token),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            expiry=self.integration.token_expiry,
            scopes=['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events']
        )

    async def get_service(self):
        creds = await self._get_credentials()
        if creds.expired:
            creds.refresh(Request())
            # Update integration in DB
            self.integration.access_token = encrypt_token(creds.token)
            self.integration.token_expiry = creds.expiry
            self.db.add(self.integration)
            await self.db.commit()
        
        return build('calendar', 'v3', credentials=creds)

    async def get_availability(self, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        """Fetch free/busy information for the primary calendar."""
        service = await self.get_service()
        
        body = {
            "timeMin": start_time.replace(tzinfo=timezone.utc).isoformat(),
            "timeMax": end_time.replace(tzinfo=timezone.utc).isoformat(),
            "items": [{"id": "primary"}]
        }
        
        freebusy_query = service.freebusy().query(body=body).execute()
        busy_slots = freebusy_query.get('calendars', {}).get('primary', {}).get('busy', [])
        return busy_slots

    async def list_events(self, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        """List actual events from the primary calendar."""
        service = await self.get_service()
        
        events_result = service.events().list(
            calendarId='primary',
            timeMin=start_time.replace(tzinfo=timezone.utc).isoformat(),
            timeMax=end_time.replace(tzinfo=timezone.utc).isoformat(),
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        return events_result.get('items', [])

    async def create_event(self, summary: str, start_time: datetime, end_time: datetime, description: str = ""):
        """Create an event in the primary Google calendar."""
        service = await self.get_service()
        
        event = {
            'summary': summary,
            'description': description,
            'start': {
                'dateTime': start_time.replace(tzinfo=timezone.utc).isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time.replace(tzinfo=timezone.utc).isoformat(),
                'timeZone': 'UTC',
            },
        }
        
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        return created_event.get('id')

    async def update_event(self, event_id: str, summary: str, start_time: datetime, end_time: datetime, description: str = ""):
        """Update an existing event in Google Calendar."""
        service = await self.get_service()
        
        event = {
            'summary': summary,
            'description': description,
            'start': {
                'dateTime': start_time.replace(tzinfo=timezone.utc).isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time.replace(tzinfo=timezone.utc).isoformat(),
                'timeZone': 'UTC',
            },
        }
        
        service.events().update(calendarId='primary', eventId=event_id, body=event).execute()

    async def delete_event(self, event_id: str):
        """Delete an event from Google Calendar."""
        service = await self.get_service()
        try:
            service.events().delete(calendarId='primary', eventId=event_id).execute()
        except Exception as e:
            print(f"DEBUG: Google event {event_id} not found or already deleted: {e}")
