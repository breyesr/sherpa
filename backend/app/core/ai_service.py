import json
import traceback
import asyncio
import re
from typing import List, Dict, Any, Optional, Tuple
from app.core.google_calendar import GoogleCalendarService
from datetime import datetime, timedelta, timezone
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_
from app.models.crm import Appointment, Client
from app.models.integration import Integration
from app.core.system_config import ConfigService
from app.core.security import encrypt_token, decrypt_token
from app.core.memory import ChatMemory

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
                name = "New Client"
                if metadata:
                    name = metadata.get("name") or metadata.get("first_name") or name
                    if metadata.get("last_name"): name = f"{name} {metadata.get('last_name')}".strip()
                platform = metadata.get("platform") if metadata else None
                is_telegram = platform == "telegram"
                client = Client(business_id=self.business.id, name=name, phone=normalized_id if not is_telegram else None, telegram_id=normalized_id if is_telegram else None, whatsapp_id=normalized_id if not is_telegram else None)
                self.db.add(client)
                await self.db.commit()
                await self.db.refresh(client)
            return client, is_new
        except Exception as e:
            traceback.print_exc()
            raise

    async def _get_openai_response(self, system_prompt: str, user_message: str, identifier: str, history: List[Dict[str, str]]) -> str:
        from openai import AsyncOpenAI
        api_key = await ConfigService.get(self.db, "OPENAI_API_KEY")
        if not api_key: return "Assistant configuration error: OpenAI API Key missing."
        openai_client = AsyncOpenAI(api_key=api_key, timeout=30.0)
        messages = [{"role": "system", "content": system_prompt}]
        for h in history: messages.append(h)
        messages.append({"role": "user", "content": user_message})
        tools = self._get_tools_definition()
        try:
            response = await openai_client.chat.completions.create(model="gpt-4o-2024-08-06", messages=messages, tools=tools, tool_choice="auto")
            response_message = response.choices[0].message
            if response_message.tool_calls:
                messages.append(response_message)
                for tool_call in response_message.tool_calls:
                    try:
                        args = json.loads(tool_call.function.arguments)
                        result = await self._dispatch_tool(tool_call.function.name, args, identifier)
                    except Exception as te: result = f"Error executing tool: {te}"
                    messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": result})
                final_response = await openai_client.chat.completions.create(model="gpt-4o-2024-08-06", messages=messages)
                return final_response.choices[0].message.content
            return response_message.content or "I processed your request but have no verbal response."
        except Exception as e:
            print(f"ERROR: OpenAI API call failed: {e}")
            raise

    async def get_response(self, identifier: str, user_message: str, metadata: Optional[Dict] = None) -> str:
        provider = await self.get_active_provider()
        try:
            # 1. Identity
            normalized_id = Client.normalize_id(identifier)
            client_obj, is_new = await self._get_client(normalized_id, metadata)
            history = await self.memory.get_history(normalized_id)
            
            # 2. Context Construction (The Meat)
            is_known = client_obj and client_obj.name and not any(client_obj.name.startswith(p) for p in ["TG_", "WA_", "New Client"])
            
            greeting_context = self.assistant_config.greeting
            if is_known:
                greeting_context = self.assistant_config.personalized_greeting.format(name=client_obj.name.split()[0])
            
            wh_str = "Not configured"
            if self.assistant_config.working_hours:
                wh_parts = [f"{d.capitalize()}: {t[0]}-{t[1]}" if (t and len(t)>=2) else f"{d.capitalize()}: Closed" for d, t in self.assistant_config.working_hours.items()]
                wh_str = "\n".join(wh_parts)

            # 3. Component Assembly (Instruction Assembler)
            
            # LAYER 1: Immutable System Guardrails
            guardrails = ""
            if self.assistant_config.strict_guardrails:
                guardrails = """
                SYSTEM GUARDRAILS (NON-NEGOTIABLE):
                - You are an appointment booking assistant ONLY.
                - Never discuss politics, religion, or controversial topics.
                - Do not provide medical, legal, or professional advice.
                - Only schedule within the provided Working Hours.
                - If asked about topics outside your scope, politely redirect to booking an appointment.
                """

            # LAYER 2: Business Rules
            logic_instruction = ""
            if self.assistant_config.logic_template == "custom_steps" and self.assistant_config.custom_steps:
                logic_instruction = f"BUSINESS RULES: You MUST follow these specific steps:\n{self.assistant_config.custom_steps}"
            else:
                logic_instruction = "BUSINESS RULES: Follow standard booking flow (check availability -> collect details -> confirm)."

            # LAYER 3: Dynamic Requirements (Reason & Details)
            requirement_instructions = []
            if self.assistant_config.require_reason:
                requirement_instructions.append("- You MUST ask for the reason/notes for the appointment before booking.")
            if self.assistant_config.confirm_details:
                requirement_instructions.append(f"- Before finalizing, show current info and ask for confirmation: Name: {client_obj.name}, Email: {client_obj.email or 'Unknown'}, Phone: {client_obj.phone or identifier}.")
            
            req_str = "\n".join(requirement_instructions)

            # 4. Final System Prompt (The Sandwich)
            system_prompt = f"""
            You are {self.assistant_config.name}, AI assistant for '{self.business.name}'.
            Tone: {self.assistant_config.tone}
            
            {guardrails}
            
            BUSINESS CONTEXT:
            - Category: {self.business.category}
            - Working Hours:
            {wh_str}
            - Greeting Rule (If history empty): "{greeting_context}"
            
            CORE OPERATING LOGIC:
            {logic_instruction}
            {req_str}
            
            OPERATIONAL RULES:
            1. Check availability with 'check_availability' BEFORE suggesting times.
            2. Times are UTC. Current UTC: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}.
            3. User-friendly dates (e.g. "Monday, Mar 10 at 10:00 AM").
            4. Use 'update_client_identity' to save name/email if missing or provided.
            """

            response_text = await asyncio.wait_for(self._get_openai_response(system_prompt, user_message, normalized_id, history), timeout=45.0)
            await self.memory.add_message(normalized_id, "user", user_message)
            await self.memory.add_message(normalized_id, "assistant", response_text)
            return response_text
        except asyncio.TimeoutError: return "I'm taking a bit longer than usual. Could you please repeat that?"
        except Exception as e:
            traceback.print_exc()
            return "I'm having trouble thinking right now. Please try again later."

    def _get_tools_definition(self):
        return [
            {"type": "function", "function": {"name": "get_available_slots", "description": "Find free time slots.", "parameters": {"type": "object", "properties": {"date": {"type": "string", "description": "ISO date"}, "days_ahead": {"type": "integer", "default": 3}}}}},
            {"type": "function", "function": {"name": "check_availability", "description": "Check if a specific time is free.", "parameters": {"type": "object", "properties": {"start_time": {"type": "string", "description": "ISO format"}, "duration_minutes": {"type": "integer", "default": 60}}, "required": ["start_time"]}}},
            {"type": "function", "function": {"name": "create_appointment", "description": "Finalize and book. Call ONLY after confirmation.", "parameters": {"type": "object", "properties": {"start_time": {"type": "string"}, "duration_minutes": {"type": "integer", "default": 60}, "notes": {"type": "string", "description": "Reason for visit"}}, "required": ["start_time", "notes"]}}},
            {"type": "function", "function": {"name": "update_client_identity", "description": "Update CRM details.", "parameters": {"type": "object", "properties": {"name": {"type": "string"}, "email": {"type": "string"}}, "required": ["name"]}}}
        ]

    async def _dispatch_tool(self, name: str, args: dict, identifier: str) -> str:
        if name == "get_available_slots": return await self._get_available_slots_tool(args.get('date'), args.get('days_ahead', 3))
        elif name == "check_availability":
            available = await self._check_availability_tool(args['start_time'], args.get('duration_minutes', 60))
            return "Available" if available else "Busy. Suggest another time."
        elif name == "create_appointment": return await self._create_appointment_tool(identifier, args['start_time'], args.get('duration_minutes', 60), args.get('notes'))
        elif name == "update_client_identity": return await self._update_client_identity_tool(identifier, args['name'], args.get('email'))
        return "Unknown tool"

    async def _check_availability_tool(self, start_iso: str, duration: int) -> bool:
        try:
            start = datetime.fromisoformat(start_iso.replace('Z', '+00:00')).astimezone(timezone.utc).replace(tzinfo=None)
            end = start + timedelta(minutes=duration)
            res = await self.db.execute(select(Appointment).where(Appointment.business_id == self.business.id, Appointment.start_time < end, Appointment.end_time > start, Appointment.status != "cancelled"))
            if res.scalars().first(): return False
            res = await self.db.execute(select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google'))
            integration = res.scalars().first()
            if integration:
                try:
                    service = GoogleCalendarService(integration, self.db)
                    busy = await service.get_availability(start, end)
                    if busy: return False
                except: pass
            return True
        except: return False

    async def _get_available_slots_tool(self, date_str: str = None, days_ahead: int = 3) -> str:
        try:
            now_utc = datetime.now(timezone.utc)
            if date_str:
                try: start_dt = datetime.fromisoformat(date_str).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                except: start_dt = now_utc
            else: start_dt = now_utc
            if start_dt == now_utc and start_dt.minute > 0: start_dt = start_dt.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
            end_dt = start_dt + timedelta(days=days_ahead)
            working_hours = self.assistant_config.working_hours or {"mon": ["09:00", "18:00"], "tue": ["09:00", "18:00"], "wed": ["09:00", "18:00"], "thu": ["09:00", "18:00"], "fri": ["09:00", "18:00"], "sat": [], "sun": []}
            res = await self.db.execute(select(Appointment).where(Appointment.business_id == self.business.id, Appointment.start_time < end_dt.replace(tzinfo=None), Appointment.end_time > start_dt.replace(tzinfo=None), Appointment.status != "cancelled"))
            busy_ranges = [(a.start_time.replace(tzinfo=timezone.utc), a.end_time.replace(tzinfo=timezone.utc)) for a in res.scalars().all()]
            res = await self.db.execute(select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google'))
            integration = res.scalars().first()
            if integration:
                try:
                    service = GoogleCalendarService(integration, self.db)
                    google_busy = await service.get_availability(start_dt, end_dt)
                    for b in google_busy: busy_ranges.append((datetime.fromisoformat(b['start'].replace('Z', '+00:00')), datetime.fromisoformat(b['end'].replace('Z', '+00:00'))))
                except: pass
            available_slots = []
            current_check = start_dt
            while current_check < end_dt and len(available_slots) < 12:
                if current_check < now_utc:
                    current_check += timedelta(minutes=60)
                    continue
                day_name = current_check.strftime('%a').lower()
                hours = working_hours.get(day_name, [])
                if hours and len(hours) >= 2:
                    wh_start = current_check.replace(hour=int(hours[0].split(':')[0]), minute=int(hours[0].split(':')[1]))
                    wh_end = current_check.replace(hour=int(hours[1].split(':')[0]), minute=int(hours[1].split(':')[1]))
                    if wh_start <= current_check < wh_end:
                        slot_end = current_check + timedelta(minutes=60)
                        if not any(current_check < b_end and slot_end > b_start for b_start, b_end in busy_ranges): available_slots.append(current_check.strftime('%A, %b %d at %H:%M'))
                current_check += timedelta(minutes=60)
            return "FREE SLOTS:\n" + "\n".join([f"- {s}" for s in available_slots]) if available_slots else "No free slots found."
        except: return "Error searching for slots."

    async def _check_client_direct(self, identifier: str) -> Client:
        client, _ = await self._get_client(identifier)
        return client

    async def _create_appointment_tool(self, identifier: str, start_iso: str, duration: int, notes: str = None) -> str:
        try:
            start = datetime.fromisoformat(start_iso.replace('Z', '+00:00')).astimezone(timezone.utc).replace(tzinfo=None)
            end = start + timedelta(minutes=duration)
            client_obj = await self._check_client_direct(identifier)
            apt = Appointment(business_id=self.business.id, client_id=client_obj.id, start_time=start, end_time=end, status="scheduled", notes=notes)
            self.db.add(apt)
            res = await self.db.execute(select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google'))
            integration = res.scalars().first()
            if integration:
                try:
                    service = GoogleCalendarService(integration, self.db)
                    google_id = await service.create_event(f"Sherpa: {client_obj.name}", start, end, f"Reason: {notes}\nBooked via AI")
                    apt.google_event_id = google_id
                except: pass
            await self.db.commit()
            return f"SUCCESS: Booked for {client_obj.name} at {start.strftime('%Y-%m-%d %H:%M')} UTC."
        except Exception as e: return f"Failed to book: {e}"

    async def _update_client_identity_tool(self, identifier: str, name: str, email: str = None) -> str:
        try:
            client_obj = await self._check_client_direct(identifier)
            client_obj.name = name
            if email: client_obj.email = email
            await self.db.commit()
            return f"SUCCESS: Identity updated."
        except: return "Failed to update identity."
