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

class AIService:
    def __init__(self, business_profile: Any, db: Any):
        self.business = business_profile
        self.db = db
        self.assistant_config = business_profile.assistant_config

    async def get_active_provider(self) -> str:
        return await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")

    async def _get_client(self, identifier: str) -> Optional[Client]:
        """Fetch client by phone, telegram_id, or whatsapp_id."""
        res = await self.db.execute(
            select(Client).where(
                Client.business_id == self.business.id,
                or_(
                    Client.phone == identifier,
                    Client.telegram_id == identifier,
                    Client.whatsapp_id == identifier
                )
            )
        )
        return res.scalars().first()

    async def _get_openai_response(self, system_prompt: str, user_message: str, identifier: str) -> str:
        from openai import AsyncOpenAI
        api_key = await ConfigService.get(self.db, "OPENAI_API_KEY")
        if not api_key: return "Assistant configuration error: OpenAI API Key missing."
        
        client = AsyncOpenAI(api_key=api_key)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
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

    async def _get_gemini_response(self, system_prompt: str, user_message: str, identifier: str) -> str:
        import google.generativeai as genai
        import asyncio
        api_key = await ConfigService.get(self.db, "GEMINI_API_KEY")
        if not api_key: return "Assistant configuration error: Gemini Key missing."
        
        genai.configure(api_key=api_key)

        def check_availability(start_time: str, duration_minutes: int = 60):
            return asyncio.run(self._check_availability_tool(start_time, duration_minutes))

        def create_appointment(client_name: str, start_time: str, duration_minutes: int = 60):
            return asyncio.run(self._create_appointment_tool(identifier, client_name, start_time, duration_minutes))
        
        def update_client_identity(name: str, email: str = None, phone: str = None):
            return asyncio.run(self._update_client_identity_tool(identifier, name, email, phone))

        model = genai.GenerativeModel(
            model_name='gemini-1.5-pro',
            tools=[check_availability, create_appointment, update_client_identity],
            system_instruction=system_prompt
        )

        chat = model.start_chat(enable_automatic_function_calling=True)
        response = chat.send_message(user_message)
        return response.text

    async def _get_claude_response(self, system_prompt: str, user_message: str, identifier: str) -> str:
        from anthropic import AsyncAnthropic
        api_key = await ConfigService.get(self.db, "CLAUDE_API_KEY")
        if not api_key: return "Assistant configuration error: Claude Key missing."
        
        client = AsyncAnthropic(api_key=api_key)
        tools = self._get_claude_tools_definition()

        response = await client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            tools=tools
        )

        if response.stop_reason == "tool_use":
            tool_use = next(block for block in response.content if block.type == "tool_use")
            result = await self._dispatch_tool(tool_use.name, tool_use.input, identifier)
            
            final_response = await client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=1024,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_message},
                    {"role": "assistant", "content": response.content},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_use.id,
                                "content": result,
                            }
                        ],
                    },
                ],
            )
            return final_response.content[0].text

        return response.content[0].text

    async def get_response(self, identifier: str, user_message: str) -> str:
        provider = await self.get_active_provider()
        client_obj = await self._get_client(identifier)
        
        # Identity Gate logic
        is_known = client_obj and client_obj.name and not client_obj.name.startswith("TG_") and not client_obj.name.startswith("WA_")
        has_email = client_obj and client_obj.email
        
        identity_instruction = ""
        if not is_known or not has_email:
            identity_instruction = """
            IMPORTANT: This user is currently ANONYMOUS or missing contact details.
            Before you confirm any booking, you MUST politely ask for their:
            1. Full Name
            2. Email Address
            Once they provide them, use the 'update_client_identity' tool to save them.
            Do NOT book an appointment until you have at least their name.
            """
        
        system_prompt = f"""
        You are {self.assistant_config.name}, an AI assistant for '{self.business.name}'.
        Your tone is {self.assistant_config.tone}.
        
        Business Context:
        - Category: {self.business.category}
        - Greeting: {self.assistant_config.greeting}
        
        Your Goal: Help clients book appointments.
        {identity_instruction}
        
        RULES:
        1. ALWAYS check availability using 'check_availability' before suggesting or confirming a time.
        2. If a slot is available and the user wants to book, use 'create_appointment'.
        3. ALL times you handle are in UTC. Current time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC.
        """

        try:
            if provider == "openai":
                return await self._get_openai_response(system_prompt, user_message, identifier)
            elif provider == "gemini":
                return await self._get_gemini_response(system_prompt, user_message, identifier)
            elif provider == "claude":
                return await self._get_claude_response(system_prompt, user_message, identifier)
            else:
                return await self._get_openai_response(system_prompt, user_message, identifier)
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

    def _get_claude_tools_definition(self):
        return [
            {
                "name": "check_availability",
                "description": "Check if a specific time slot is free.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "start_time": {"type": "string"},
                        "duration_minutes": {"type": "integer"}
                    },
                    "required": ["start_time"]
                }
            },
            {
                "name": "create_appointment",
                "description": "Finalize and book the appointment.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "client_name": {"type": "string"},
                        "start_time": {"type": "string"},
                        "duration_minutes": {"type": "integer"}
                    },
                    "required": ["client_name", "start_time"]
                }
            },
            {
                "name": "update_client_identity",
                "description": "Update the client's name, email or phone in the CRM.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "email": {"type": "string"},
                        "phone": {"type": "string"}
                    },
                    "required": ["name"]
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

    async def _create_appointment_tool(self, identifier: str, name: str, start_iso: str, duration: int) -> str:
        start = datetime.fromisoformat(start_iso.replace('Z', '+00:00')).astimezone(timezone.utc).replace(tzinfo=None)
        end = start + timedelta(minutes=duration)
        
        client_obj = await self._get_client(identifier)
        if not client_obj:
            client_obj = Client(business_id=self.business.id, name=name, phone=identifier)
            self.db.add(client_obj)
            await self.db.flush()
        
        apt = Appointment(business_id=self.business.id, client_id=client_obj.id, start_time=start, end_time=end, status="scheduled")
        self.db.add(apt)
        
        res = await self.db.execute(select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google'))
        integration = res.scalars().first()
        if integration:
            try:
                service = GoogleCalendarService(integration, self.db)
                google_id = await service.create_event(
                    summary=f"Sherpa: {name}", 
                    description=f"Client: {name}\nID: {identifier}\nBooked via AI Assistant", 
                    start_time=start, 
                    end_time=end
                )
                apt.google_event_id = google_id
            except Exception as e: 
                print(f"Google Sync Error: {e}")
        
        await self.db.commit()
        return f"SUCCESS: Appointment booked for {name} at {start.strftime('%Y-%m-%d %H:%M')} UTC."

    async def _update_client_identity_tool(self, identifier: str, name: str, email: str = None, phone: str = None) -> str:
        """Updates the CRM record for an existing client."""
        client_obj = await self._get_client(identifier)
        if not client_obj:
            return "ERROR: Client record not found. This should not happen if webhooks are working."
        
        client_obj.name = name
        if email: client_obj.email = email
        if phone: client_obj.phone = phone
        
        await self.db.commit()
        return f"SUCCESS: Client identity updated to {name}."
