import asyncio
import os
import sys
from unittest.mock import patch, MagicMock

# Ensure backend folder is in path
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.business import BusinessProfile
from app.models.crm import Client
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

# Mock the Celery tasks so we can inspect their invocations
@patch("app.tasks.messages.process_sales_rep_message")
@patch("app.tasks.messages.process_distributor_message")
@patch("app.tasks.messages.process_prospect_message")
async def run_tests(mock_prospect_task, mock_distributor_task, mock_sales_rep_task):
    client = TestClient(app)
    
    # 1. Fetch our target business profile and clean up any role settings
    async with SessionLocal() as db:
        # Use business "Alejandro" (ID: 069b397d-5646-70aa-8000-55dbb6e613c4)
        biz_id = "069b397d-5646-70aa-8000-55dbb6e613c4"
        biz_res = await db.execute(select(BusinessProfile).where(BusinessProfile.id == biz_id))
        business = biz_res.scalars().first()
        if not business:
            print(f"ERROR: Target business profile {biz_id} not found in DB.")
            return

        # Ensure a WhatsApp integration exists for this business
        from app.models.integration import Integration
        int_res = await db.execute(
            select(Integration).where(Integration.business_id == biz_id, Integration.provider == "whatsapp")
        )
        integration = int_res.scalars().first()
        if not integration:
            print("Creating WhatsApp integration for business Alejandro...")
            integration = Integration(
                business_id=biz_id,
                provider="whatsapp",
                settings={
                    "provider_type": "twilio_platform",
                    "twilio_from_number": "14155238886",
                    "is_sandbox": True
                }
            )
            db.add(integration)

        # Let's verify or update clients for testing
        # Client 1: Roberto (Phone: 3331110099) - distributor_retailer (associated with La Tiendita del Oeste)
        # Client 2: Juan Ciervo (Phone: 5281876540) - let's set role to 'sales_rep' and make sure they belong to Alejandro
        juan_res = await db.execute(select(Client).where(Client.phone == "5281876540"))
        juan = juan_res.scalars().first()
        if juan:
            print(f"Setting Client Juan Ciervo's role to 'sales_rep' and business_id to {biz_id}")
            juan.role = "sales_rep"
            juan.business_id = biz_id
            
        roberto_res = await db.execute(select(Client).where(Client.phone == "3331110099"))
        roberto = roberto_res.scalars().first()
        if roberto:
            print(f"Ensuring Roberto's business_id is set to {biz_id}")
            roberto.business_id = biz_id
            
        await db.commit()
            
    print(f"\nTarget Business Profile: {business.name} (ID: {business.id})")
    
    # We will simulate webhook requests to: /api/v1/whatsapp/webhook/twilio
    webhook_url = "/api/v1/whatsapp/webhook/twilio"
    
    # Setup test cases:
    # 1. Prospect (Unknown): From = +12349990001
    # 2. Retailer (Roberto): From = +3331110099
    # 3. Sales Rep (Juan): From = +5281876540
    # To = Twilio sandbox number or our integration number (which uses sandbox fallback)
    
    # Let's test different routing configs:
    
    test_cases = [
        {
            "name": "Scenario A: All flows ENABLED",
            "routing_config": {
                "prospective_clients": {"enabled": True},
                "distributors_retailers": {"enabled": True},
                "sales_reps": {"enabled": True}
            },
            "steps": [
                {
                    "label": "Prospect message",
                    "from": "whatsapp:+12349990001",
                    "body": "Hola, precio de Super Soda?",
                    "expected_status": 200,
                    "expected_task": mock_prospect_task,
                    "expect_rejected": False
                },
                {
                    "label": "Distributor/Retailer message",
                    "from": "whatsapp:+3331110099",
                    "body": "Quiero solicitar material pop",
                    "expected_status": 200,
                    "expected_task": mock_distributor_task,
                    "expect_rejected": False
                },
                {
                    "label": "Sales Rep message",
                    "from": "whatsapp:+5281876540",
                    "body": "Briefing de La Tiendita del Oeste",
                    "expected_status": 200,
                    "expected_task": mock_sales_rep_task,
                    "expect_rejected": False
                }
            ]
        },
        {
            "name": "Scenario B: Only Sales Reps and Prospects ENABLED, Distributors DISABLED",
            "routing_config": {
                "prospective_clients": {"enabled": True},
                "distributors_retailers": {"enabled": False},
                "sales_reps": {"enabled": True}
            },
            "steps": [
                {
                    "label": "Prospect message (enabled)",
                    "from": "whatsapp:+12349990001",
                    "body": "Hola",
                    "expected_status": 200,
                    "expected_task": mock_prospect_task,
                    "expect_rejected": False
                },
                {
                    "label": "Distributor message (disabled)",
                    "from": "whatsapp:+3331110099",
                    "body": "Necesito ayuda",
                    "expected_status": 200,
                    "expected_task": None,
                    "expect_rejected": True
                },
                {
                    "label": "Sales Rep message (enabled)",
                    "from": "whatsapp:+5281876540",
                    "body": "Dame mis citas",
                    "expected_status": 200,
                    "expected_task": mock_sales_rep_task,
                    "expect_rejected": False
                }
            ]
        },
        {
            "name": "Scenario C: All flows DISABLED",
            "routing_config": {
                "prospective_clients": {"enabled": False},
                "distributors_retailers": {"enabled": False},
                "sales_reps": {"enabled": False}
            },
            "steps": [
                {
                    "label": "Prospect message (disabled)",
                    "from": "whatsapp:+12349990001",
                    "body": "Hola",
                    "expected_status": 200,
                    "expected_task": None,
                    "expect_rejected": True
                },
                {
                    "label": "Distributor message (disabled)",
                    "from": "whatsapp:+3331110099",
                    "body": "Ayuda",
                    "expected_status": 200,
                    "expected_task": None,
                    "expect_rejected": True
                },
                {
                    "label": "Sales Rep message (disabled)",
                    "from": "whatsapp:+5281876540",
                    "body": "Citas",
                    "expected_status": 200,
                    "expected_task": None,
                    "expect_rejected": True
                }
            ]
        }
    ]
    
    for case in test_cases:
        print(f"\n=========================================")
        print(f"RUNNING: {case['name']}")
        print(f"Applying Routing Config: {case['routing_config']}")
        
        async with SessionLocal() as db:
            biz = await db.get(BusinessProfile, biz_id)
            biz.routing_config = case["routing_config"]
            await db.commit()
            
        for step in case["steps"]:
            # Reset mock tasks
            mock_prospect_task.reset_mock()
            mock_distributor_task.reset_mock()
            mock_sales_rep_task.reset_mock()
            
            form_payload = {
                "From": step["from"],
                "To": "whatsapp:+14155238886", # Standard Twilio sandbox number
                "Body": step["body"],
                "ProfileName": "Test Sender"
            }
            
            print(f"\n--- {step['label']} ---")
            print(f"Request From: {step['from']} | Body: '{step['body']}'")
            
            response = client.post(webhook_url, data=form_payload)
            
            print(f"Response status: {response.status_code}")
            print(f"TwiML Output: {response.text}")
            
            assert response.status_code == step["expected_status"], f"Expected {step['expected_status']}, got {response.status_code}"
            
            if step["expect_rejected"]:
                assert "no está habilitado" in response.text or "not enabled" in response.text or "no habilitado" in response.text or "Este servicio no está habilitado actualmente" in response.text
                assert mock_prospect_task.apply_async.call_count == 0
                assert mock_distributor_task.apply_async.call_count == 0
                assert mock_sales_rep_task.call_count == 0
                print("✅ Successfully Rejected (as configured)")
            else:
                assert step["expected_task"].apply_async.call_count == 1
                called_args, called_kwargs = step["expected_task"].apply_async.call_args
                print(f"✅ Successfully Dispatched. Celery args: {called_kwargs.get('args', called_args)}, queue: {called_kwargs.get('queue')}")

    # 2. Test the /test-chat endpoint
    print("\n=========================================")
    print("RUNNING: Sandbox /test-chat Endpoint Routing Tests")
    
    from app.api.auth import get_current_user
    from app.models.user import User
    
    # Load a test user to override auth dependency (specifically the owner of Alejandro business)
    async with SessionLocal() as db:
        biz = await db.get(BusinessProfile, biz_id)
        test_user = await db.get(User, biz.user_id)
        if not test_user:
            print("ERROR: No user found for sandbox test override.")
            return
            
    # Override auth
    app.dependency_overrides[get_current_user] = lambda: test_user
    
    # Configure business profile routing_config to have all enabled
    async with SessionLocal() as db:
        biz = await db.get(BusinessProfile, biz_id)
        biz.routing_config = {
            "prospective_clients": {"enabled": True},
            "distributors_retailers": {"enabled": True},
            "sales_reps": {"enabled": True}
        }
        await db.commit()
        
    sandbox_url = "/api/v1/business/test-chat"
    
    # Check prospect simulation
    print("\n--- Sandbox: Simulating prospective_client role ---")
    res = client.post(sandbox_url, json={"message": "Hola, quiero 100 cajas", "simulate_role": "prospective_client"})
    print(f"Status: {res.status_code} | Body: {res.json()}")
    assert res.status_code == 200
    assert "response" in res.json()
    print("✅ Sandbox prospect simulation call works")
    
    # Check disabled prospect simulation
    async with SessionLocal() as db:
        biz = await db.get(BusinessProfile, biz_id)
        biz.routing_config = {
            "prospective_clients": {"enabled": False},
            "distributors_retailers": {"enabled": True},
            "sales_reps": {"enabled": True}
        }
        await db.commit()
        
    print("\n--- Sandbox: Simulating prospective_client role (DISABLED) ---")
    res = client.post(sandbox_url, json={"message": "Hola, quiero 100 cajas", "simulate_role": "prospective_client"})
    print(f"Status: {res.status_code} | Body: {res.json()}")
    assert res.status_code == 200
    assert "no está habilitado" in res.json()["response"]
    print("✅ Sandbox prospect simulation disabled check works")
    
    # Clear dependency overrides
    app.dependency_overrides.clear()
                 
    print("\n🎉 ALL TEST SCENARIOS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(run_tests())
