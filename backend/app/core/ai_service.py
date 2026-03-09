import json
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
import google.generativeai as genai
from anthropic import AsyncAnthropic
from app.core.google_calendar import GoogleCalendarService
from datetime import datetime, timedelta, timezone
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
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

    async def get_response(self, customer_phone: str, user_message: str) -> str:
        provider = await self.get_active_provider()
        
        system_prompt = f"""
        You are {self.assistant_config.name}, an AI assistant for '{self.business.name}'.
        Your tone is {self.assistant_config.tone}.
        
        Business Context:
        - Category: {self.business.category}
        - Greeting: {self.assistant_config.greeting}
        
        Your Goal: Help clients book appointments.
        
        RULES:
        1. ALWAYS check availability using 'check_availability' before suggesting or confirming a time.
        2. If a slot is available and the user wants to book, use 'create_appointment'.
        3. If you don't know the user's name, ask for it before finalizing a booking.
        4. ALL times you handle are in UTC. Current time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC.
        """

        if provider == "openai":
            return await self._get_openai_response(system_prompt, user_message, customer_phone)
        elif provider == "gemini":
            return await self._get_gemini_response(system_prompt, user_message, customer_phone)
        elif provider == "claude":
            return await self._get_claude_response(system_prompt, user_message, customer_phone)
        else:
            return await self._get_openai_response(system_prompt, user_message, customer_phone)

    async def _get_openai_response(self, system_prompt: str, user_message: str, phone: str) -> str:
        api_key = await ConfigService.get(self.db, "OPENAI_API_KEY")
        if not api_key: raise Exception("OpenAI API Key missing")
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
                result = await self._dispatch_tool(tool_call.function.name, json.loads(tool_call.function.arguments), phone)
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

    async def _get_gemini_response(self, system_prompt: str, user_message: str, phone: str) -> str:
        api_key = await ConfigService.get(self.db, "GEMINI_API_KEY")
        if not api_key: raise Exception("Gemini API Key missing")
        genai.configure(api_key=api_key)
        
        # Tools definition for Gemini
        def check_availability(start_time: str, duration_minutes: int = 60):
            import asyncio
            # Gemini sync tool calling wrapper
            return asyncio.run(self._check_availability_tool(start_time, duration_minutes))

        def create_appointment(client_name: str, start_time: str, duration_minutes: int = 60):
            import asyncio
            return asyncio.run(self._create_appointment_tool(phone, client_name, start_time, duration_minutes))

        model = genai.GenerativeModel(
            model_name='gemini-1.5-pro',
            tools=[check_availability, create_appointment],
            system_instruction=system_prompt
        )

        chat = model.start_chat(enable_automatic_function_calling=True)
        response = chat.send_message(user_message)
        return response.text

    async def _get_claude_response(self, system_prompt: str, user_message: str, phone: str) -> str:
        api_key = await ConfigService.get(self.db, "CLAUDE_API_KEY")
        if not api_key: raise Exception("Claude API Key missing")
        client = AsyncAnthropic(api_key=api_key)

        tools = [
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
            }
        ]

        response = await client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            tools=tools
        )

        if response.stop_reason == "tool_use":
            # Handle tool use for Claude
            # This is a bit more manual in Claude but follow the same logic
            tool_use = next(block for block in response.content if block.type == "tool_use")
            result = await self._dispatch_tool(tool_use.name, tool_use.input, phone)
            
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
            }
        ]

    async def _dispatch_tool(self, name: str, args: dict, phone: str) -> str:
        if name == "check_availability":
            available = await self._check_availability_tool(args['start_time'], args.get('duration_minutes', 60))
            return "Available" if available else "Busy. Suggest another time."
        elif name == "create_appointment":
            return await self._create_appointment_tool(phone, args['client_name'], args['start_time'], args.get('duration_minutes', 60))
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

    async def _create_appointment_tool(self, phone: str, name: str, start_iso: str, duration: int) -> str:
        start = datetime.fromisoformat(start_iso.replace('Z', '+00:00')).astimezone(timezone.utc).replace(tzinfo=None)
        end = start + timedelta(minutes=duration)
        res = await self.db.execute(select(Client).where(Client.business_id == self.business.id, Client.phone == phone))
        client_obj = res.scalars().first()
        if not client_obj:
            client_obj = Client(business_id=self.business.id, name=name, phone=phone)
            self.db.add(client_obj)
            await self.db.flush()
        apt = Appointment(business_id=self.business.id, client_id=client_obj.id, start_time=start, end_time=end, status="scheduled")
        self.db.add(apt)
        res = await self.db.execute(select(Integration).where(Integration.business_id == self.business.id, Integration.provider == 'google'))
        integration = res.scalars().first()
        if integration:
            try:
                service = GoogleCalendarService(integration, self.db)
                google_id = await service.create_event(summary=f"Sherpa: {name}", description=f"Client: {name}\nPhone: {phone}\nBooked via AI Assistant", start_time=start, end_time=end)
                apt.google_event_id = google_id
            except Exception as e: print(f"Google Sync Error: {e}")
        await self.db.commit()
        return f"SUCCESS: Appointment booked for {name} at {start.strftime('%Y-%m-%d %H:%M')} UTC."
