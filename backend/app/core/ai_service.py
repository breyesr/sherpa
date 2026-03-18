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
        id_hash = Client.hash_id(identifier)
        
        # 1. Primary Search: Use the privacy-preserving hashes
        res = await self.db.execute(
            select(Client).where(
                Client.business_id == self.business.id,
                or_(
                    Client.telegram_id_hash == id_hash,
                    Client.whatsapp_id_hash == id_hash,
                    Client.phone == identifier
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
                        Client.telegram_id == identifier,
                        Client.whatsapp_id == identifier
                    )
                )
            )
            client = res.scalars().first()
            
            if client:
                print(f"DEBUG: Self-healing client {client.id}. Populating missing hashes.")
                # If we found it by raw ID, it means the hash was missing. Populate it now.
                if client.telegram_id == identifier:
                    client.telegram_id_hash = id_hash
                    client.telegram_id = encrypt_token(identifier)
                if client.whatsapp_id == identifier:
                    client.whatsapp_id_hash = id_hash
                    client.whatsapp_id = encrypt_token(identifier)
                
                await self.db.commit()
        
        # 3. Auto-Registration: If still not found, create a new client
        if not client:
            print(f"DEBUG: Auto-registering new client for identifier: {identifier}")
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
                phone=identifier if not is_telegram else None,
                telegram_id=encrypt_token(identifier) if is_telegram else None,
                telegram_id_hash=id_hash if is_telegram else None,
                whatsapp_id=encrypt_token(identifier) if not is_telegram else None,
                whatsapp_id_hash=id_hash if not is_telegram else None
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
        
        # Unified client lookup (includes auto-reg and healing)
        client_obj = await self._get_client(identifier, metadata)
        
        # Retrieve history from Redis
        history = await self.memory.get_history(identifier)
        
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
                response_text = await self._get_openai_response(system_prompt, user_message, identifier, history)
            else:
                # Fallback or other providers...
                response_text = await self._get_openai_response(system_prompt, user_message, identifier, history)
            
            # Save to Memory
            await self.memory.add_message(identifier, "user", user_message)
            await self.memory.add_message(identifier, "assistant", response_text)
            
            return response_text
        except Exception as e:
            print(f"CRITICAL: {provider.upper()} Provider Failed: {str(e)}")
            return "I'm having trouble thinking right now. Please try again in a moment."

    def _get_tools_definition(self):
        return [
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
        if name == "check_availability":
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
            client_obj.phone = phone
            # Update WhatsApp mapping as it is phone-based
            client_obj.whatsapp_id = encrypt_token(phone)
            client_obj.whatsapp_id_hash = Client.hash_id(phone)
        
        await self.db.commit()
        return f"SUCCESS: Client identity updated to {name}."
