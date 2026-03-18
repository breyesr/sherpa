import json
from typing import List, Dict, Any, Optional
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

    async def _get_client(self, identifier: str, metadata: Optional[Dict] = None) -> Client:
        """
        Find a client by identifier (phone, telegram_id, whatsapp_id) using hashes.
        Includes self-healing for legacy plain-text IDs and auto-registration for new users.
        """
        # CRITICAL: Always normalize the incoming identifier (remove +, spaces, etc)
        normalized_id = Client.normalize_id(identifier)
        id_hash = Client.hash_id(normalized_id)
        
        # 1. Primary Search: Use the privacy-preserving hashes OR normalized phone
        res = await self.db.execute(
            select(Client).where(
                Client.business_id == self.business.id,
                or_(
                    Client.telegram_id_hash == id_hash,
                    Client.whatsapp_id_hash == id_hash,
                    Client.phone == normalized_id
                )
            )
        )
        client = res.scalars().first()

        # 2. Self-Healing Fallback: Check for legacy plain-text IDs if hash fails
        if not client:
            res = await self.db.execute(
                select(Client).where(
                    Client.business_id == self.business.id,
                    or_(
                        Client.telegram_id == normalized_id,
                        Client.whatsapp_id == normalized_id
                    )
                )
            )
            client = res.scalars().first()
            
            if client:
                print(f"DEBUG: Self-healing client {client.id}. Populating missing hashes via model listener.")
                # We just need to trigger a save, the model listener will handle the rest
                client.updated_at = datetime.utcnow()
                await self.db.commit()
        
        # 3. Auto-Registration: If still not found, create a new client
        if not client:
            print(f"DEBUG: Auto-registering new client for normalized ID: {normalized_id}")
            name = "New Client"
            if metadata:
                name = metadata.get("name") or metadata.get("first_name") or name
                if metadata.get("last_name"):
                    name = f"{name} {metadata.get('last_name')}".strip()
            
            # Determine platform for ID storage
            platform = metadata.get("platform") if metadata else None
            is_telegram = platform == "telegram"
            
            client = Client(
                business_id=self.business.id,
                name=name,
                # Model listener will auto-generate hashes and encrypt IDs from these raw values
                phone=normalized_id if not is_telegram else None,
                telegram_id=normalized_id if is_telegram else None,
                whatsapp_id=normalized_id if not is_telegram else None
            )
            self.db.add(client)
            await self.db.commit()
            await self.db.refresh(client)
            
        return client

    async def _get_openai_response(self, system_prompt: str, user_message: str, identifier: str, history: List[Dict[str, str]]) -> str:
        from openai import AsyncOpenAI
        api_key = await ConfigService.get(self.db, "OPENAI_API_KEY")
        if not api_key: return "Assistant configuration error: OpenAI API Key missing."
        
        client = AsyncOpenAI(api_key=api_key)
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add history
        for h in history:
            messages.append(h)
            
        # Add current message
        messages.append({"role": "user", "content": user_message})
        
        tools = self._get_tools_definition()

        response = await client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )

        response_message = response.choices[0].message
        if response_message.tool_calls:
            messages.append(response_message)
            for tool_call in response_message.tool_calls:
                result = await self._dispatch_tool(tool_call.function.name, json.loads(tool_call.function.arguments), identifier)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result
                })
            
            final_response = await client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=messages
            )
            return final_response.choices[0].message.content

        return response_message.content

    async def get_response(self, identifier: str, user_message: str, metadata: Optional[Dict] = None) -> str:
        provider = await self.get_active_provider()
        
        # Normalize for consistency in memory and lookup
        normalized_id = Client.normalize_id(identifier)
        
        # Unified client lookup (includes auto-reg and healing)
        client_obj = await self._get_client(normalized_id, metadata)
        
        # Retrieve history from Redis (using normalized ID for consistent keys)
        history = await self.memory.get_history(normalized_id)
        
        # Identity Gate logic
        is_known = client_obj and client_obj.name and not client_obj.name.startswith("TG_") and not client_obj.name.startswith("WA_") and client_obj.name != "New Client"
        has_email = client_obj and client_obj.email
        
        # Determine Greeting
        greeting = self.assistant_config.greeting
        if is_known and len(history) == 0:
            greeting = self.assistant_config.personalized_greeting.format(name=client_obj.name.split()[0])
        
        # Logic Template influence
        logic_instruction = ""
        if self.assistant_config.logic_template == "custom_steps" and self.assistant_config.custom_steps:
            logic_instruction = f"Follow these specific custom steps: {self.assistant_config.custom_steps}"
        else:
            logic_instruction = "Follow the standard booking flow: check availability, ask for missing details, then confirm."

        identity_instruction = ""
        if not is_known or not has_email:
            identity_instruction = f"""
            IMPORTANT: This user is currently ANONYMOUS or missing contact details.
            Current Name in CRM: {client_obj.name if client_obj else 'Unknown'}
            Before you confirm any booking, you MUST politely ask for their:
            1. Full Name (if not known)
            2. Email Address (if not known)
            Once they provide them, use the 'update_client_identity' tool to save them.
            Do NOT book an appointment until you have at least their name.
            """
        
        system_prompt = f"""
        You are {self.assistant_config.name}, an AI assistant for '{self.business.name}'.
        Your tone is {self.assistant_config.tone}.
        
        Business Context:
        - Category: {self.business.category}
        - Greeting context: {greeting}
        
        Your Goal: Help clients book appointments.
        {logic_instruction}
        {identity_instruction}
        
        RULES:
        1. ALWAYS check availability using 'check_availability' before suggesting or confirming a time.
        2. If a slot is available and the user wants to book, use 'create_appointment'.
        3. ALL times you handle are in UTC. Current time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC.
        4. Reference previous messages in the history to avoid repeating questions.
        5. If this is the start of the conversation, use the Greeting context to guide your opening.
        """

        try:
            # We currently only fully support memory for OpenAI in this patch
            if provider == "openai":
                response_text = await self._get_openai_response(system_prompt, user_message, normalized_id, history)
            else:
                # Fallback or other providers...
                response_text = await self._get_openai_response(system_prompt, user_message, normalized_id, history)
            
            # Save to Memory (using normalized ID)
            await self.memory.add_message(normalized_id, "user", user_message)
            await self.memory.add_message(normalized_id, "assistant", response_text)
            
            return response_text
        except Exception as e:
            print(f"CRITICAL: {provider.upper()} Provider Failed: {str(e)}")
            return "I'm having trouble thinking right now. Please try again in a moment."

    def _get_tools_definition(self):
        return [
            {
                "type": "function",
                "function": {
                    "name": "get_available_slots",
                    "description": "Find free time slots for a specific date or range.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "date": {"type": "string", "description": "ISO date (YYYY-MM-DD) to check. If omitted, checks from today."},
                            "days_ahead": {"type": "integer", "default": 3, "description": "How many days to look ahead."}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "check_availability",
                    "description": "Check if a specific time slot is free.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "start_time": {"type": "string", "description": "ISO format"},
                            "duration_minutes": {"type": "integer", "default": 60}
                        },
                        "required": ["start_time"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_appointment",
                    "description": "Finalize and book the appointment.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "client_name": {"type": "string"},
                            "start_time": {"type": "string"},
                            "duration_minutes": {"type": "integer", "default": 60}
                        },
                        "required": ["client_name", "start_time"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "update_client_identity",
                    "description": "Update the client's name, email or phone in the CRM.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "User's full name"},
                            "email": {"type": "string", "description": "User's email address"},
                            "phone": {"type": "string", "description": "User's phone number"}
                        },
                        "required": ["name"]
                    }
                }
            }
        ]

    async def _dispatch_tool(self, name: str, args: dict, identifier: str) -> str:
        if name == "get_available_slots":
            return await self._get_available_slots_tool(args.get('date'), args.get('days_ahead', 3))
        elif name == "check_availability":
            available = await self._check_availability_tool(args['start_time'], args.get('duration_minutes', 60))
            return "Available" if available else "Busy. Suggest another time."
        elif name == "create_appointment":
            return await self._create_appointment_tool(identifier, args['client_name'], args['start_time'], args.get('duration_minutes', 60))
        elif name == "update_client_identity":
            return await self._update_client_identity_tool(identifier, args['name'], args.get('email'), args.get('phone'))
        return "Unknown tool"

    async def _check_availability_tool(self, start_iso: str, duration: int) -> bool:
        start = datetime.fromisoformat(start_iso.replace('Z', '+00:00')).astimezone(timezone.utc).replace(tzinfo=None)
        end = start + timedelta(minutes=duration)
        res = await self.db.execute(
            select(Appointment).where(
                Appointment.business_id == self.business.id,
                Appointment.start_time < end,
                Appointment.end_time > start,
                Appointment.status != "cancelled"
            )
        )
        if res.scalars().first(): return False
        res = await self.db.execute(
            select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google')
        )
        integration = res.scalars().first()
        if integration:
            try:
                service = GoogleCalendarService(integration, self.db)
                busy = await service.get_availability(start, end)
                if busy: return False
            except: pass
        return True

    async def _get_available_slots_tool(self, date_str: str = None, days_ahead: int = 3) -> str:
        """
        Calculates free slots by checking working hours, Google Calendar, and local DB.
        """
        # 1. Determine time range
        if date_str:
            try:
                start_dt = datetime.fromisoformat(date_str).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
            except:
                start_dt = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            start_dt = datetime.now(timezone.utc)

        end_dt = start_dt + timedelta(days=days_ahead)
        
        # 2. Get Business Working Hours
        # Default: 09:00 to 18:00 if not set
        working_hours = self.assistant_config.working_hours or {
            "mon": ["09:00", "18:00"], "tue": ["09:00", "18:00"], "wed": ["09:00", "18:00"],
            "thu": ["09:00", "18:00"], "fri": ["09:00", "18:00"], "sat": [], "sun": []
        }

        # 3. Gather all Busy Slots (Google + Local)
        # Fetch local appointments in range
        res = await self.db.execute(
            select(Appointment).where(
                Appointment.business_id == self.business.id,
                Appointment.start_time < end_dt.replace(tzinfo=None),
                Appointment.end_time > start_dt.replace(tzinfo=None),
                Appointment.status != "cancelled"
            )
        )
        local_apts = res.scalars().all()
        
        busy_ranges = []
        for apt in local_apts:
            busy_ranges.append((apt.start_time.replace(tzinfo=timezone.utc), apt.end_time.replace(tzinfo=timezone.utc)))

        # Fetch Google busy slots
        res = await self.db.execute(
            select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google')
        )
        integration = res.scalars().first()
        if integration:
            try:
                service = GoogleCalendarService(integration, self.db)
                google_busy = await service.get_availability(start_dt, end_dt)
                for b in google_busy:
                    b_start = datetime.fromisoformat(b['start'].replace('Z', '+00:00'))
                    b_end = datetime.fromisoformat(b['end'].replace('Z', '+00:00'))
                    busy_ranges.append((b_start, b_end))
            except: pass

        # 4. Iterate and find gaps
        available_slots = []
        current_check = start_dt
        
        # Let's check in 1-hour increments during working hours
        while current_check < end_dt:
            # Skip if in the past
            if current_check < datetime.now(timezone.utc):
                current_check += timedelta(minutes=60)
                continue

            day_name = current_check.strftime('%a').lower() # mon, tue...
            hours = working_hours.get(day_name, [])
            
            if hours and len(hours) >= 2:
                wh_start_str, wh_end_str = hours[0], hours[1]
                wh_start = current_check.replace(hour=int(wh_start_str.split(':')[0]), minute=int(wh_start_str.split(':')[1]), second=0)
                wh_end = current_check.replace(hour=int(wh_end_str.split(':')[0]), minute=int(wh_end_str.split(':')[1]), second=0)
                
                if wh_start <= current_check < wh_end:
                    # Check if this slot (assume 1h) conflicts with any busy range
                    slot_end = current_check + timedelta(minutes=60)
                    is_busy = False
                    for b_start, b_end in busy_ranges:
                        if current_check < b_end and slot_end > b_start:
                            is_busy = True
                            break
                    
                    if not is_busy:
                        available_slots.append(current_check.strftime('%Y-%m-%d %H:%M'))
            
            current_check += timedelta(minutes=60)
            # Limit number of slots returned to avoid token bloat
            if len(available_slots) >= 15: break

        if not available_slots:
            return "No available slots found in this range. Try another date."
        
        return "Available slots: " + ", ".join(available_slots) + " (UTC)"

    async def _check_client_direct(self, identifier: str) -> Client:
        """Helper for tools to get client without meta."""
        return await self._get_client(identifier)

    async def _create_appointment_tool(self, identifier: str, name: str, start_iso: str, duration: int) -> str:
        start = datetime.fromisoformat(start_iso.replace('Z', '+00:00')).astimezone(timezone.utc).replace(tzinfo=None)
        end = start + timedelta(minutes=duration)
        
        client_obj = await self._check_client_direct(identifier)
        if client_obj.name == "New Client":
            client_obj.name = name
            await self.db.commit()
        
        apt = Appointment(business_id=self.business.id, client_id=client_obj.id, start_time=start, end_time=end, status="scheduled")
        self.db.add(apt)
        
        res = await self.db.execute(select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google'))
        integration = res.scalars().first()
        if integration:
            try:
                service = GoogleCalendarService(integration, self.db)
                google_id = await service.create_event(
                    summary=f"Sherpa: {client_obj.name}", 
                    description=f"Client: {client_obj.name}\nID: {identifier}\nBooked via AI Assistant", 
                    start_time=start, 
                    end_time=end
                )
                apt.google_event_id = google_id
            except Exception as e: 
                print(f"Google Sync Error: {e}")
        
        await self.db.commit()
        return f"SUCCESS: Appointment booked for {client_obj.name} at {start.strftime('%Y-%m-%d %H:%M')} UTC."

    async def _update_client_identity_tool(self, identifier: str, name: str, email: str = None, phone: str = None) -> str:
        client_obj = await self._check_client_direct(identifier)
        
        client_obj.name = name
        if email: client_obj.email = email
        if phone: 
            # Listener will handle the encryption and hashing of this new phone
            client_obj.phone = phone
        
        await self.db.commit()
        return f"SUCCESS: Client identity updated to {name}."
