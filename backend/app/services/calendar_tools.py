import json
import traceback
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy.future import select
from app.models.crm import Appointment, Client
from app.models.service import Service
from app.models.integration import Integration
from app.core.google_calendar import GoogleCalendarService

class CalendarToolKit:
    def __init__(self, business: Any, db: Any, assistant_config: Any = None):
        self.business = business
        self.db = db
        self.assistant_config = assistant_config

    @staticmethod
    def get_tool_definitions(vertical_type: str = "BASIC") -> List[Dict[str, Any]]:
        """Returns tool definitions for calendar and general client management."""
        tools = [
            {"type": "function", "function": {"name": "get_available_slots", "description": "Find free time slots.", "parameters": {"type": "object", "properties": {"date": {"type": "string"}, "duration_minutes": {"type": "integer", "description": "Duration of the service"}, "days_ahead": {"type": "integer", "default": 3}}}}},
            {"type": "function", "function": {"name": "check_availability", "description": "Check if a specific time is free.", "parameters": {"type": "object", "properties": {"start_time": {"type": "string"}, "duration_minutes": {"type": "integer", "description": "Duration of the service"}}, "required": ["start_time"]}}},
            {"type": "function", "function": {"name": "get_client_appointments", "description": "List all future scheduled appointments for a client.", "parameters": {"type": "object", "properties": {"client_identifier": {"type": "string", "description": "The unique identifier of the client"}}, "required": ["client_identifier"]}}},
            {"type": "function", "function": {"name": "flag_for_review", "description": "INTERNAL ALERT: Notify the manager that this client needs human assistance.", "parameters": {"type": "object", "properties": {"client_identifier": {"type": "string"}, "reason": {"type": "string", "description": "Reason for the alert"}}, "required": ["client_identifier"]}}},
            {"type": "function", "function": {"name": "update_client_metadata", "description": "SAVE INFO: Store specific custom details about the client/lead discovered during chat.", "parameters": {"type": "object", "properties": {"client_identifier": {"type": "string"}, "metadata": {"type": "object", "description": "Key-value pairs to save"}}, "required": ["client_identifier", "metadata"]}}}
        ]

        create_apt_params = {
            "type": "object",
            "properties": {
                "client_identifier": {"type": "string", "description": "The unique identifier of the client"},
                "start_time": {"type": "string", "description": "ISO format"},
                "service_id": {"type": "string", "description": "The ID of the service selected"},
                "notes": {"type": "string", "description": "Reason for visit or additional details"}
            },
            "required": ["client_identifier", "start_time", "notes"]
        }

        if vertical_type == "TRADE":
            create_apt_params["properties"]["store_id"] = {"type": "string", "description": "The ID of the Store/Account to visit"}
            create_apt_params["properties"]["customer_id"] = {"type": "string", "description": "The ID of the Customer/Contact at the store"}
        
        tools.append({
            "type": "function", 
            "function": {
                "name": "create_appointment", 
                "description": "Book the appointment/visit in the system.",
                "parameters": create_apt_params
            }
        })
        return tools

    async def _get_client(self, identifier: str) -> Client:
        normalized_id = Client.normalize_id(identifier)
        id_hash = Client.hash_id(normalized_id)
        from sqlalchemy import or_
        res = await self.db.execute(select(Client).where(Client.business_id == self.business.id, or_(Client.telegram_id_hash == id_hash, Client.whatsapp_id_hash == id_hash, Client.phone == normalized_id)))
        return res.scalars().first()

    async def check_availability(self, start_time: str, duration_minutes: int = None) -> Dict[str, Any]:
        try:
            biz_tz = ZoneInfo(self.business.timezone or "UTC")
            dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            if dt.tzinfo is None or (dt.utcoffset() == timedelta(0) and self.business.timezone != "UTC"):
                dt = dt.replace(tzinfo=None).replace(tzinfo=biz_tz)
            
            duration = duration_minutes or 60
            start_utc = dt.astimezone(timezone.utc).replace(tzinfo=None)
            end_utc = start_utc + timedelta(minutes=duration)
            
            res = await self.db.execute(select(Appointment).where(Appointment.business_id == self.business.id, Appointment.start_time < end_utc, Appointment.end_time > start_utc, Appointment.status != "cancelled"))
            if res.scalars().first(): return {"available": False, "reason": "Conflict with internal appointment"}
            
            res_int = await self.db.execute(select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google'))
            integration = res_int.scalars().first()
            if integration:
                try:
                    service = GoogleCalendarService(integration, self.db)
                    busy = await service.get_availability(dt.astimezone(timezone.utc), (dt + timedelta(minutes=duration)).astimezone(timezone.utc))
                    if busy: return {"available": False, "reason": "Conflict with Google Calendar"}
                except Exception:
                    pass
            return {"available": True}
        except Exception as e:
            return {"error": str(e)}

    async def get_available_slots(self, date: str = None, duration_minutes: int = None, days_ahead: int = 3) -> Dict[str, Any]:
        try:
            biz_tz = ZoneInfo(self.business.timezone or "UTC")
            now_local = datetime.now(biz_tz)
            slot_duration = duration_minutes or 60
            
            if date:
                try: 
                    parsed_dt = datetime.fromisoformat(date)
                    start_dt = parsed_dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=biz_tz)
                except Exception:
                    start_dt = now_local
            else: start_dt = now_local
            
            if start_dt.date() == now_local.date() and start_dt.hour == now_local.hour:
                start_dt = start_dt.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
            
            end_dt = start_dt + timedelta(days=days_ahead)
            
            res = await self.db.execute(select(Appointment).where(Appointment.business_id == self.business.id, Appointment.start_time < end_dt.astimezone(timezone.utc).replace(tzinfo=None), Appointment.end_time > start_dt.astimezone(timezone.utc).replace(tzinfo=None), Appointment.status != "cancelled"))
            busy_ranges = [(a.start_time.replace(tzinfo=timezone.utc).astimezone(biz_tz), a.end_time.replace(tzinfo=timezone.utc).astimezone(biz_tz)) for a in res.scalars().all()]
            
            res_int = await self.db.execute(select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google'))
            integration = res_int.scalars().first()
            if integration:
                try:
                    service = GoogleCalendarService(integration, self.db)
                    google_events = await service.list_events(start_dt.astimezone(timezone.utc), end_dt.astimezone(timezone.utc))
                    for e in google_events:
                        if e.get('summary', '').startswith("Sherpa:"): continue
                        s_str = e.get('start', {}).get('dateTime') or e.get('start', {}).get('date')
                        e_str = e.get('end', {}).get('dateTime') or e.get('end', {}).get('date')
                        busy_ranges.append((datetime.fromisoformat(s_str.replace('Z', '+00:00')).astimezone(biz_tz), datetime.fromisoformat(e_str.replace('Z', '+00:00')).astimezone(biz_tz)))
                except Exception:
                    pass
            
            working_hours = (self.assistant_config.working_hours if self.assistant_config else None) or {"mon": ["09:00", "18:00"], "tue": ["09:00", "18:00"], "wed": ["09:00", "18:00"], "thu": ["09:00", "18:00"], "fri": ["09:00", "18:00"], "sat": [], "sun": []}
            available_slots = []
            current_check = start_dt
            
            while current_check < end_dt and len(available_slots) < 15:
                if current_check < now_local:
                    current_check += timedelta(minutes=60); continue
                day_name = current_check.strftime('%a').lower()
                hours = working_hours.get(day_name, [])
                if hours and len(hours) >= 2:
                    wh_start = current_check.replace(hour=int(hours[0].split(':')[0]), minute=int(hours[0].split(':')[1]))
                    wh_end = current_check.replace(hour=int(hours[1].split(':')[0]), minute=int(hours[1].split(':')[1]))
                    if wh_start <= current_check < wh_end:
                        slot_end = current_check + timedelta(minutes=slot_duration)
                        if not any(current_check < b_end and slot_end > b_start for b_start, b_end in busy_ranges):
                            available_slots.append(current_check.strftime('%A, %b %d at %H:%M'))
                current_check += timedelta(minutes=60)
            
            return {"slots": available_slots, "timezone": self.business.timezone or "UTC"}
        except Exception as e:
            return {"error": str(e)}

    async def create_appointment(self, client_identifier: str, start_time: str, service_id: str = None, notes: str = None, store_id: str = None, customer_id: str = None) -> Dict[str, Any]:
        try:
            biz_tz = ZoneInfo(self.business.timezone or "UTC")
            dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            if dt.tzinfo is None or (dt.utcoffset() == timedelta(0) and self.business.timezone != "UTC"):
                dt = dt.replace(tzinfo=None).replace(tzinfo=biz_tz)
            
            duration = 60
            service_name = "General Visit"
            if service_id:
                res_svc = await self.db.execute(select(Service).where(Service.id == service_id, Service.business_id == self.business.id))
                svc = res_svc.scalars().first()
                if not svc:
                    return {
                        "success": False,
                        "error": f"The requested service_id '{service_id}' is not in the active business service catalog. Please select a valid service from the catalog."
                    }
                duration = svc.duration_minutes or 60
                service_name = svc.name

            start_utc = dt.astimezone(timezone.utc).replace(tzinfo=None)
            end_utc = start_utc + timedelta(minutes=duration)
            client_obj = await self._get_client(client_identifier)
            if not client_obj: return {"success": False, "error": "Client not found"}

            # Identity Verification Hard Lock (Task 222.1)
            placeholders = ["TG_", "WA_", "New Client", "Unknown Client", "Unknown"]
            is_placeholder_name = not client_obj.name or any(client_obj.name.startswith(p) for p in placeholders)
            if is_placeholder_name:
                return {
                    "success": False,
                    "error": "Cannot book appointment: Client identity incomplete. Please ask for and register the client's name first."
                }

            location_str = ""
            if store_id:
                from app.models.trade import Store
                res_store = await self.db.execute(select(Store).where(Store.id == store_id))
                store = res_store.scalars().first()
                if store:
                    service_name = f"Visit: {store.name}"
                    location_str = store.address or ""
            
            res_existing = await self.db.execute(select(Appointment).where(Appointment.business_id == self.business.id, Appointment.client_id == client_obj.id, Appointment.status == "scheduled", Appointment.start_time > datetime.utcnow()).order_by(Appointment.start_time))
            existing_apt = res_existing.scalars().first()
            
            res_int = await self.db.execute(select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google'))
            integration = res_int.scalars().first()
            service = GoogleCalendarService(integration, self.db) if integration else None

            if existing_apt:
                existing_apt.start_time = start_utc
                existing_apt.end_time = end_utc
                if service_id: existing_apt.service_id = service_id
                if notes: existing_apt.notes = notes
                if store_id: existing_apt.store_id = store_id
                if customer_id: existing_apt.customer_id = customer_id
                
                if service and existing_apt.google_event_id:
                    try:
                        await service.update_event(event_id=existing_apt.google_event_id, summary=f"Sherpa: {service_name}", start_time=start_utc, end_time=end_utc, description=f"Reason: {notes or existing_apt.notes}\nRescheduled via AI", location=location_str)
                    except Exception:
                        pass
                await self.db.commit()
                return {"success": True, "action": "rescheduled", "new_time": dt.strftime('%Y-%m-%d %H:%M')}
            else:
                apt = Appointment(business_id=self.business.id, client_id=client_obj.id, service_id=service_id, store_id=store_id, customer_id=customer_id, start_time=start_utc, end_time=end_utc, status="scheduled", notes=notes)
                self.db.add(apt)
                if service:
                    try:
                        google_id = await service.create_event(summary=f"Sherpa: {service_name}", start_time=start_utc, end_time=end_utc, description=f"Reason: {notes}\nBooked via AI", location=location_str)
                        apt.google_event_id = google_id
                    except Exception:
                        pass
                await self.db.commit()
                return {"success": True, "action": "booked", "time": dt.strftime('%Y-%m-%d %H:%M')}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_client_appointments(self, client_identifier: str) -> Dict[str, Any]:
        try:
            biz_tz = ZoneInfo(self.business.timezone or "UTC")
            client_obj = await self._get_client(client_identifier)
            if not client_obj: return {"error": "Client not found"}
            res = await self.db.execute(select(Appointment).where(Appointment.business_id == self.business.id, Appointment.client_id == client_obj.id, Appointment.status == "scheduled", Appointment.start_time > datetime.utcnow()).order_by(Appointment.start_time))
            apts = res.scalars().all()
            formatted = []
            for a in apts:
                local_start = a.start_time.replace(tzinfo=timezone.utc).astimezone(biz_tz)
                formatted.append({"time": local_start.strftime('%A, %b %d at %H:%M'), "notes": a.notes})
            return {"appointments": formatted}
        except Exception as e:
            return {"error": str(e)}

    async def flag_for_review(self, client_identifier: str, reason: str = None) -> Dict[str, Any]:
        try:
            client_obj = await self._get_client(client_identifier)
            if not client_obj: return {"error": "Client not found"}
            if not client_obj.custom_fields: client_obj.custom_fields = {}
            client_obj.custom_fields["needs_review"] = True
            client_obj.custom_fields["review_reason"] = reason or "AI got stuck"
            client_obj.custom_fields["last_review_flag"] = datetime.utcnow().isoformat()
            await self.db.commit()
            return {"success": True}
        except Exception as e:
            return {"error": str(e)}

    async def update_client_metadata(self, client_identifier: str, metadata: dict) -> Dict[str, Any]:
        try:
            client_obj = await self._get_client(client_identifier)
            if not client_obj: return {"error": "Client not found"}
            if not client_obj.custom_fields: client_obj.custom_fields = {}
            updated_fields = dict(client_obj.custom_fields)
            for key, value in metadata.items():
                updated_fields[str(key).lower().replace(" ", "_")] = value
            client_obj.custom_fields = updated_fields
            await self.db.commit()
            return {"success": True}
        except Exception as e:
            return {"error": str(e)}
