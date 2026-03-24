import json
import traceback
import asyncio
import re
from typing import List, Dict, Any, Optional, Tuple
from jinja2 import Environment, FileSystemLoader, select_autoescape
import litellm
from app.core.google_calendar import GoogleCalendarService
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_
from app.models.crm import Appointment, Client
from app.models.service import Service
from app.models.integration import Integration
from app.core.system_config import ConfigService
from app.core.security import encrypt_token, decrypt_token
from app.core.memory import ChatMemory

# Setup prompt template environment
try:
    # Use relative path as seen from backend root
    prompt_env = Environment(
        loader=FileSystemLoader("app/core/prompts"),
        autoescape=select_autoescape()
    )
except Exception as e:
    print(f"CRITICAL: Failed to initialize Jinja2 environment: {e}")
    prompt_env = None

class AIService:
    def __init__(self, business_profile: Any, db: Any):
        self.business = business_profile
        self.db = db
        self.assistant_config = business_profile.assistant_config
        self.memory = ChatMemory()

    async def get_active_provider(self) -> str:
        return await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")

    async def _get_client(self, identifier: str, metadata: Optional[Dict] = None) -> Tuple[Client, bool]:
        """Find or register client with self-healing hashes."""
        try:
            normalized_id = Client.normalize_id(identifier)
            id_hash = Client.hash_id(normalized_id)
            res = await self.db.execute(select(Client).where(Client.business_id == self.business.id, or_(Client.telegram_id_hash == id_hash, Client.whatsapp_id_hash == id_hash, Client.phone == normalized_id)))
            client = res.scalars().first()
            if not client:
                res = await self.db.execute(select(Client).where(Client.business_id == self.business.id, or_(Client.telegram_id == normalized_id, Client.whatsapp_id == normalized_id)))
                client = res.scalars().first()
                if client:
                    client.updated_at = datetime.utcnow()
                    await self.db.commit()
            is_new = False
            if not client:
                is_new = True
                # CRITICAL: Do not use metadata to guess the name. 
                # The name MUST come from the user message as per the flowchart.
                name = "Unknown Client"
                platform = metadata.get("platform") if metadata else None
                is_telegram = platform == "telegram"
                client = Client(business_id=self.business.id, name=name, phone=normalized_id if not is_telegram else None, telegram_id=normalized_id if is_telegram else None, whatsapp_id=normalized_id if not is_telegram else None)
                self.db.add(client)
                await self.db.commit()
                await self.db.refresh(client)
            return client, is_new
        except Exception as e:
            print(f"DIAGNOSTIC: _get_client failed for {identifier}: {e}")
            traceback.print_exc()
            raise

    async def _get_llm_response(self, system_prompt: str, user_message: str, identifier: str, history: List[Dict[str, str]]) -> str:
        provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
        
        # Determine default model based on provider
        default_model = "gpt-4o-mini"
        if provider == "gemini": default_model = "gemini-1.5-flash"
        elif provider == "anthropic": default_model = "claude-3-haiku-20240307"
        
        model = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", default_model)
        api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")
        
        if not api_key:
            return f"Assistant configuration error: {provider.upper()} API Key missing."

        messages = [{"role": "system", "content": system_prompt}]
        for h in history:
            messages.append(h)
        messages.append({"role": "user", "content": user_message})
        
        tools = self._get_tools_definition()

        try:
            # LiteLLM handles the conversion between different provider formats
            response = await litellm.acompletion(
                model=f"{provider}/{model}" if "/" not in model else model,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                api_key=api_key,
                timeout=45.0
            )

            response_message = response.choices[0].message
            if response_message.get("tool_calls"):
                messages.append(response_message)
                for tool_call in response_message.tool_calls:
                    print(f"DEBUG: AI calling tool: {tool_call.function.name}")
                    try:
                        args = json.loads(tool_call.function.arguments)
                        result = await self._dispatch_tool(tool_call.function.name, args, identifier)
                    except Exception as te:
                        print(f"ERROR: Tool {tool_call.function.name} failed: {te}")
                        result = f"Error executing tool: {te}"
                        
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result
                    })
                
                final_response = await litellm.acompletion(
                    model=f"{provider}/{model}" if "/" not in model else model,
                    messages=messages,
                    api_key=api_key,
                    timeout=45.0
                )
                return final_response.choices[0].message.content
            
            return response_message.content or "I processed your request but have no verbal response."
        except Exception as e:
            print(f"ERROR: LLM generation failed: {e}")
            traceback.print_exc()
            raise

    async def get_response(self, identifier: str, user_message: str, metadata: Optional[Dict] = None) -> str:
        """Entry point for all messaging platforms."""
        try:
            # 1. Identity Stage
            client_obj, is_new = await self._get_client(identifier, metadata)
            normalized_id = Client.normalize_id(identifier)
            
            # 2. Memory Stage
            history = await self.memory.get_history(normalized_id)
            
            # 3. Prompt Construction Stage (Jinja2)
            try:
                if not prompt_env:
                    raise Exception("Jinja2 environment not initialized")
                
                template = prompt_env.get_template("system_prompt.j2")
                
                # Fetch Active Services for the business
                res_services = await self.db.execute(
                    select(Service).where(Service.business_id == self.business.id, Service.is_active == True)
                )
                services = res_services.scalars().all()
                
                # Prepare context for template
                working_hours = self.assistant_config.working_hours or {}
                wh_parts = []
                for day, times in working_hours.items():
                    if times and len(times) >= 2:
                        wh_parts.append(f"{day.capitalize()}: {times[0]}-{times[1]}")
                    else:
                        wh_parts.append(f"{day.capitalize()}: Closed")
                
                wh_str = "\n".join(wh_parts)
                
                # 1. Improved 'is_known' logic and Data Status
                missing_fields = []
                # Check for various placeholder names
                placeholders = ["TG_", "WA_", "New Client", "Unknown Client", "Unknown"]
                is_placeholder_name = not client_obj.name or any(client_obj.name.startswith(p) for p in placeholders)
                
                if is_placeholder_name:
                    missing_fields.append("full name")
                if not client_obj.email or "@" not in client_obj.email:
                    missing_fields.append("email address")
                
                # Phone Check: If it's a 'test_' ID or just the identifier, we want a real phone
                is_real_phone = client_obj.phone and client_obj.phone.isdigit() and len(client_obj.phone) >= 7
                if not is_real_phone:
                    missing_fields.append("phone number")

                # A user is truly known ONLY if all fields are present and valid
                is_known = len(missing_fields) == 0 and not is_new

                # 2. Greeting & Identity Context Construction
                if is_known:
                    try:
                        # For known users, we use the Personalized Greeting
                        first_name = client_obj.name.split()[0]
                        raw_template = self.assistant_config.personalized_greeting or "Hola {name}, ¿en qué puedo ayudarte hoy?"
                        greeting_context = raw_template.replace("{name}", first_name)\
                                                       .replace("{first_name}", first_name)\
                                                       .replace("{full_name}", client_obj.name)\
                                                       .replace("{full name}", client_obj.name)
                        
                        identity_instruction = f"IDENTITY CONFIRMATION: This is a returning client. Greet them by their full name '{client_obj.name}'. Show them their registered info (Email: {client_obj.email}, Phone: {client_obj.phone or identifier}) and ask them to confirm if it is still correct before proceeding to book."
                    except Exception as ge:
                        print(f"WARNING: Personalized greeting formatting failed: {ge}")
                        greeting_context = self.assistant_config.greeting
                        identity_instruction = "IDENTITY CONFIRMATION: Greet the user and verify their details."
                else:
                    # Unknown user: ALWAYS use the Standard Greeting
                    greeting_context = self.assistant_config.greeting
                    identity_instruction = f"IDENTITY COLLECTION: This is a NEW or incomplete lead. You MUST politely ask for their missing information ({', '.join(missing_fields)}) before you are allowed to book any appointment. DO NOT mention appointments until you have these details."

                # Business Timezone
                biz_tz = ZoneInfo(self.business.timezone or "UTC")
                local_now = datetime.now(biz_tz)

                system_prompt = template.render(
                    assistant=self.assistant_config,
                    business=self.business,
                    client=client_obj,
                    services=services,
                    client_identifier=identifier,
                    working_hours=wh_str,
                    greeting_context=greeting_context,
                    identity_instruction=identity_instruction,
                    is_known=is_known,
                    missing_fields=missing_fields,
                    current_time=local_now.strftime('%Y-%m-%d %H:%M')
                )
            except Exception as e:
                print(f"CRITICAL: Prompt Construction Stage (Jinja2) Failed: {e}")
                traceback.print_exc()
                return "I'm having trouble setting up the conversation. Please try again."

            # 4. Generation Stage
            try:
                response_text = await self._get_llm_response(system_prompt, user_message, identifier, history)
            except Exception as e:
                print(f"CRITICAL: Generation Stage Failed: {e}")
                return "I'm having trouble thinking right now. My AI provider might be busy or misconfigured. Please try again later."

            
            # 5. Save to Memory
            try:
                await self.memory.add_message(normalized_id, "user", user_message)
                await self.memory.add_message(normalized_id, "assistant", response_text)
            except Exception as e:
                print(f"WARNING: Memory Save Failed: {e}")

            return response_text
            
        except Exception as e:
            print(f"CRITICAL: AIService UNCAUGHT ERROR for {identifier}: {e}")
            traceback.print_exc()
            return "I'm having unexpected trouble. Please try again later."

    def _get_tools_definition(self):
        return [
            {"type": "function", "function": {"name": "get_available_slots", "description": "Find free time slots.", "parameters": {"type": "object", "properties": {"date": {"type": "string"}, "duration_minutes": {"type": "integer", "description": "Duration of the service"}, "days_ahead": {"type": "integer", "default": 3}}}}},
            {"type": "function", "function": {"name": "check_availability", "description": "Check if a specific time is free.", "parameters": {"type": "object", "properties": {"start_time": {"type": "string"}, "duration_minutes": {"type": "integer", "description": "Duration of the service"}}, "required": ["start_time"]}}},
            {"type": "function", "function": {
                "name": "create_appointment", 
                "description": "FINAL STEP: Book the appointment in the system. PRE-CONDITION: You MUST have already asked for the 'reason' and received user 'confirmation' of their contact info as per system instructions. Do NOT call this early.", 
                "parameters": {
                    "type": "object", 
                    "properties": {
                        "start_time": {"type": "string", "description": "ISO format"}, 
                        "service_id": {"type": "string", "description": "The ID of the service selected by the user"},
                        "notes": {"type": "string", "description": "Reason for visit or additional details"}
                    }, 
                    "required": ["start_time", "notes"]
                }
            }},
            {"type": "function", "function": {"name": "update_client_identity", "description": "REGISTER USER: Save the client's name, email, and phone to the system. This is mandatory for new or unknown users.", "parameters": {"type": "object", "properties": {"name": {"type": "string"}, "email": {"type": "string"}, "phone": {"type": "string"}}, "required": ["name"]}}},
            {"type": "function", "function": {"name": "get_client_appointments", "description": "List all future scheduled appointments for the current user.", "parameters": {"type": "object", "properties": {}}}},
            {"type": "function", "function": {"name": "flag_for_review", "description": "INTERNAL ALERT: Notify the manager that this client needs human assistance because you are stuck or don't have the info requested.", "parameters": {"type": "object", "properties": {"reason": {"type": "string", "description": "What the user asked that you didn't know"}}}}}
        ]

    async def _dispatch_tool(self, name: str, args: dict, identifier: str) -> str:
        if name == "get_available_slots": return await self._get_available_slots_tool(args.get('date'), args.get('duration_minutes'), args.get('days_ahead', 3))
        elif name == "check_availability":
            available = await self._check_availability_tool(args['start_time'], args.get('duration_minutes'))
            return "Available" if available else "Busy. Suggest another time."
        elif name == "create_appointment": return await self._create_appointment_tool(identifier, args['start_time'], args.get('service_id'), args.get('notes'))
        elif name == "update_client_identity": return await self._update_client_identity_tool(identifier, args['name'], args.get('email'), args.get('phone'))
        elif name == "get_client_appointments": return await self._get_client_appointments_tool(identifier)
        elif name == "flag_for_review": return await self._flag_for_review_tool(identifier, args.get('reason'))
        return "Unknown tool"

    async def _check_availability_tool(self, start_iso: str, duration_minutes: int = None) -> bool:
        try:
            biz_tz = ZoneInfo(self.business.timezone or "UTC")
            # Parse ISO string. 
            dt = datetime.fromisoformat(start_iso.replace('Z', '+00:00'))
            
            # If naive OR marked as UTC (but business isn't UTC), assume it's business local time.
            if dt.tzinfo is None or (dt.utcoffset() == timedelta(0) and self.business.timezone != "UTC"):
                dt = dt.replace(tzinfo=None).replace(tzinfo=biz_tz)
            
            duration = duration_minutes or 60
            start_utc = dt.astimezone(timezone.utc).replace(tzinfo=None)
            end_utc = start_utc + timedelta(minutes=duration)
            
            res = await self.db.execute(select(Appointment).where(Appointment.business_id == self.business.id, Appointment.start_time < end_utc, Appointment.end_time > start_utc, Appointment.status != "cancelled"))
            if res.scalars().first(): return False
            
            res = await self.db.execute(select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google'))
            integration = res.scalars().first()
            if integration:
                try:
                    service = GoogleCalendarService(integration, self.db)
                    busy = await service.get_availability(dt.astimezone(timezone.utc), (dt + timedelta(minutes=duration)).astimezone(timezone.utc))
                    if busy: return False
                except: pass
            return True
        except: return False

    async def _get_available_slots_tool(self, date_str: str = None, duration_minutes: int = None, days_ahead: int = 3) -> str:
        try:
            biz_tz = ZoneInfo(self.business.timezone or "UTC")
            now_local = datetime.now(biz_tz)
            
            slot_duration = duration_minutes or 60
            
            if date_str:
                try: 
                    # Parse date and set to start of day in business timezone
                    parsed_dt = datetime.fromisoformat(date_str)
                    start_dt = parsed_dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=biz_tz)
                except: 
                    start_dt = now_local
            else: 
                start_dt = now_local
            
            # Round up to next hour if it's currently today
            if start_dt.date() == now_local.date() and start_dt.hour == now_local.hour:
                start_dt = start_dt.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
            
            end_dt = start_dt + timedelta(days=days_ahead)
            
            # Fetch existing local appointments
            res = await self.db.execute(
                select(Appointment).where(
                    Appointment.business_id == self.business.id, 
                    Appointment.start_time < end_dt.astimezone(timezone.utc).replace(tzinfo=None), 
                    Appointment.end_time > start_dt.astimezone(timezone.utc).replace(tzinfo=None), 
                    Appointment.status != "cancelled"
                )
            )
            
            # Convert existing busy ranges to local business time for easy comparison
            busy_ranges = [
                (a.start_time.replace(tzinfo=timezone.utc).astimezone(biz_tz), 
                 a.end_time.replace(tzinfo=timezone.utc).astimezone(biz_tz)) 
                for a in res.scalars().all()
            ]
            
            # Check Google Calendar integration
            res = await self.db.execute(select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google'))
            integration = res.scalars().first()
            if integration:
                try:
                    service = GoogleCalendarService(integration, self.db)
                    # Use list_events to get summaries and filter out Sherpa-created events
                    google_events = await service.list_events(start_dt.astimezone(timezone.utc), end_dt.astimezone(timezone.utc))
                    for e in google_events:
                        summary = e.get('summary', '')
                        if summary.startswith("Sherpa:"):
                            continue # Skip our own appointments
                            
                        start_str = e.get('start', {}).get('dateTime') or e.get('start', {}).get('date')
                        end_str = e.get('end', {}).get('dateTime') or e.get('end', {}).get('date')
                        
                        busy_ranges.append((
                            datetime.fromisoformat(start_str.replace('Z', '+00:00')).astimezone(biz_tz), 
                            datetime.fromisoformat(end_str.replace('Z', '+00:00')).astimezone(biz_tz)
                        ))
                except: pass
            
            working_hours = self.assistant_config.working_hours or {"mon": ["09:00", "18:00"], "tue": ["09:00", "18:00"], "wed": ["09:00", "18:00"], "thu": ["09:00", "18:00"], "fri": ["09:00", "18:00"], "sat": [], "sun": []}
            
            available_slots = []
            current_check = start_dt
            
            while current_check < end_dt and len(available_slots) < 15:
                # Skip past times
                if current_check < now_local:
                    current_check += timedelta(minutes=60)
                    continue
                
                day_name = current_check.strftime('%a').lower()
                hours = working_hours.get(day_name, [])
                
                if hours and len(hours) >= 2:
                    # Construct start/end of working day in business timezone
                    wh_start = current_check.replace(hour=int(hours[0].split(':')[0]), minute=int(hours[0].split(':')[1]))
                    wh_end = current_check.replace(hour=int(hours[1].split(':')[0]), minute=int(hours[1].split(':')[1]))
                    
                    if wh_start <= current_check < wh_end:
                        slot_end = current_check + timedelta(minutes=slot_duration)
                        # Check for overlaps with any busy range (now all in biz_tz)
                        if not any(current_check < b_end and slot_end > b_start for b_start, b_end in busy_ranges):
                            available_slots.append(current_check.strftime('%A, %b %d at %H:%M'))
                
                current_check += timedelta(minutes=60)
            
            # Add explicit timezone label to the slots response
            tz_name = self.business.timezone or "UTC"
            return f"FREE SLOTS (in {tz_name} time):\n" + "\n".join([f"- {s}" for s in available_slots]) if available_slots else "No free slots found."
        except Exception as e:
            print(f"Error in _get_available_slots_tool: {e}")
            traceback.print_exc()
            return "Error searching for slots."

    async def _check_client_direct(self, identifier: str) -> Client:
        client, _ = await self._get_client(identifier)
        return client

    async def _create_appointment_tool(self, identifier: str, start_iso: str, service_id: str = None, notes: str = None) -> str:
        try:
            biz_tz = ZoneInfo(self.business.timezone or "UTC")
            # Parse ISO string.
            dt = datetime.fromisoformat(start_iso.replace('Z', '+00:00'))
            
            # If naive OR marked as UTC (but business isn't UTC), assume it's business local time.
            if dt.tzinfo is None or (dt.utcoffset() == timedelta(0) and self.business.timezone != "UTC"):
                dt = dt.replace(tzinfo=None).replace(tzinfo=biz_tz)
            
            # Fetch Service to get duration
            duration = 60
            service_name = "General Visit"
            if service_id:
                res_svc = await self.db.execute(select(Service).where(Service.id == service_id))
                svc = res_svc.scalars().first()
                if svc:
                    duration = svc.duration_minutes or 60
                    service_name = svc.name

            start_utc = dt.astimezone(timezone.utc).replace(tzinfo=None)
            end_utc = start_utc + timedelta(minutes=duration)
            
            client_obj = await self._check_client_direct(identifier)
...
            if existing_apt:
                # RESCHEDULE MODE
                print(f"DEBUG: Rescheduling existing appointment {existing_apt.id}")
                
                # Convert old time to business local for feedback
                old_local = existing_apt.start_time.replace(tzinfo=timezone.utc).astimezone(biz_tz)
                old_time_str = old_local.strftime('%Y-%m-%d %H:%M')
                
                existing_apt.start_time = start_utc
                existing_apt.end_time = end_utc
                if service_id: existing_apt.service_id = service_id
                if notes: existing_apt.notes = notes
                
                if service and existing_apt.google_event_id:
                    try:
                        await service.update_event(
                            event_id=existing_apt.google_event_id,
                            summary=f"Sherpa: {client_obj.name} ({service_name})",
                            start_time=start_utc,
                            end_time=end_utc,
                            description=f"Reason: {notes or existing_apt.notes}\nRescheduled via AI"
                        )
                    except: pass
                
                await self.db.commit()
                local_start = dt.astimezone(biz_tz)
                return f"SUCCESS: Your appointment for {service_name} has been MOVED from {old_time_str} to {local_start.strftime('%Y-%m-%d %H:%M')} ({self.business.timezone or 'UTC'})."
            
            else:
                # NEW BOOKING MODE
                apt = Appointment(business_id=self.business.id, client_id=client_obj.id, service_id=service_id, start_time=start_utc, end_time=end_utc, status="scheduled", notes=notes)
                self.db.add(apt)
                
                if service:
                    try:
                        google_id = await service.create_event(f"Sherpa: {client_obj.name} ({service_name})", start_utc, end_utc, f"Reason: {notes}\nBooked via AI")
                        apt.google_event_id = google_id
                    except: pass
                
                await self.db.commit()
                local_start = dt.astimezone(biz_tz)
                return f"SUCCESS: Booked {service_name} for {client_obj.name} at {local_start.strftime('%Y-%m-%d %H:%M')} ({self.business.timezone or 'UTC'})."
                
        except Exception as e: 
            traceback.print_exc()
            return f"Failed to book or reschedule: {e}"

    async def _update_client_identity_tool(self, identifier: str, name: str, email: str = None, phone: str = None) -> str:
        try:
            client_obj = await self._check_client_direct(identifier)
            client_obj.name = name
            if email: client_obj.email = email
            if phone: client_obj.phone = Client.normalize_id(phone)
            await self.db.commit()
            return f"SUCCESS: Identity updated and user registered as {name}."
        except: return "Failed to update identity."

    async def _get_client_appointments_tool(self, identifier: str) -> str:
        """Fetch and format all future scheduled appointments for this client."""
        try:
            biz_tz = ZoneInfo(self.business.timezone or "UTC")
            client_obj = await self._check_client_direct(identifier)
            
            res = await self.db.execute(
                select(Appointment).where(
                    Appointment.business_id == self.business.id,
                    Appointment.client_id == client_obj.id,
                    Appointment.status == "scheduled",
                    Appointment.start_time > datetime.utcnow()
                ).order_by(Appointment.start_time)
            )
            apts = res.scalars().all()
            
            if not apts:
                return "You have no upcoming appointments scheduled."
            
            lines = [f"FOUND {len(apts)} UPCOMING APPOINTMENTS:"]
            for a in apts:
                local_start = a.start_time.replace(tzinfo=timezone.utc).astimezone(biz_tz)
                lines.append(f"- {local_start.strftime('%A, %b %d at %H:%M')} (Reason: {a.notes or 'General visit'})")
            
            return "\n".join(lines)
        except Exception as e:
            print(f"Error in _get_client_appointments_tool: {e}")
            return "Error retrieving your appointments."

    async def _flag_for_review_tool(self, identifier: str, reason: str = None) -> str:
        try:
            client_obj = await self._check_client_direct(identifier)
            if not client_obj.custom_fields:
                client_obj.custom_fields = {}
            
            client_obj.custom_fields["needs_review"] = True
            client_obj.custom_fields["review_reason"] = reason or "AI got stuck"
            client_obj.custom_fields["last_review_flag"] = datetime.utcnow().isoformat()
            
            await self.db.commit()
            return "SUCCESS: Manager has been notified."
        except Exception as e:
            print(f"Error in _flag_for_review_tool: {e}")
            return "Error notifying manager."
