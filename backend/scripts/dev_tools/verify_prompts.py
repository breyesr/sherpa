
import asyncio
from typing import Any
from jinja2 import Environment, FileSystemLoader, select_autoescape
from datetime import datetime
from zoneinfo import ZoneInfo

# Mock classes to simulate SQLAlchemy models
class MockAgent:
    def __init__(self):
        self.name = "Sherpa Assistant"
        self.tone = "Professional"
        self.greeting = "Hello! How can I help you today?"
        self.personalized_greeting = "Hola {name}, welcome back!"
        self.working_hours = {"mon": ["09:00", "18:00"]}
        self.require_reason = True
        self.confirm_details = True
        self.enable_honesty = True
        self.enable_internal_alert = True
        self.enable_lead_capture = True
        self.enable_emergency_phone = True
        self.logic_template = "standard"
        self.custom_steps = None
        self.strict_guardrails = True

class MockBusiness:
    def __init__(self, vertical):
        self.id = "biz_123"
        self.name = "Test Business"
        self.category = "Retail"
        self.timezone = "UTC"
        self.vertical_type = vertical
        self.contact_phone = "+123456789"
        self.crm_config = [{"label": "Pet Name", "key": "pet_name", "type": "text"}]

class MockClient:
    def __init__(self, is_known=False):
        self.name = "John Doe" if is_known else "Unknown Client"
        self.email = "john@example.com" if is_known else None
        self.phone = "1234567" if is_known else None
        self.custom_fields = {"loyalty_tier": "Gold"} if is_known else {}

def test_render():
    env = Environment(
        loader=FileSystemLoader("backend/app/core/prompts"),
        autoescape=select_autoescape()
    )

    # Scenarios
    scenarios = [
        {"name": "B2C (BASIC) - New Client", "vertical": "BASIC", "known": False, "template": "b2c_scheduler.j2"},
        {"name": "B2B (TRADE) - Sales Rep", "vertical": "TRADE", "known": True, "template": "b2b_sales_brain.j2"}
    ]

    for s in scenarios:
        print(f"\n{'='*20} {s['name']} {'='*20}")
        template = env.get_template(s['template'])
        
        biz = MockBusiness(s['vertical'])
        agent = MockAgent()
        client = MockClient(s['known'])
        
        missing = []
        if not s['known']:
            missing = ["full name", "email address", "phone number"]

        output = template.render(
            assistant=agent,
            business=biz,
            client=client,
            services=[], # Empty for test
            working_hours="Mon-Fri: 09:00-18:00",
            greeting_context=agent.greeting,
            identity_instruction="Gating Logic Here",
            is_known=s['known'],
            missing_fields=missing,
            current_time=datetime.now().strftime('%Y-%m-%d %H:%M'),
            summary="User asked about pricing.",
            intent="REPORT" if s['vertical'] == "TRADE" else None
        )
        print(output)

if __name__ == "__main__":
    test_render()
