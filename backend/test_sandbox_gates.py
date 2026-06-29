import asyncio
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure backend folder is in path
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from fastapi import Response
from app.main import app
from app.api.auth import get_current_user
from app.api.business import get_full_business
from app.core.database import get_db
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.integration import Integration

# We will define a mock user and mock business profiles for test cases
mock_user = User(id="user_test_123", email="test@business.com")

class MockBusinessProfile:
    def __init__(self, features_config=None, routing_config=None):
        self.id = "biz_test_123"
        self.name = "Test Business"
        self.user_id = "user_test_123"
        self.features_config = features_config or {}
        self.routing_config = routing_config or {}
        self.agents = []
        self.integrations = []
        self.assistant_config = None

class MockTelegramSession:
    def __init__(self, integration, business):
        self.integration = integration
        self.business = business
        
    async def execute(self, stmt):
        mock_res = MagicMock()
        stmt_str = str(stmt).lower()
        if "integration" in stmt_str:
            mock_res.scalars().all.return_value = [self.integration]
            mock_res.scalars().first.return_value = self.integration
        elif "business" in stmt_str:
            mock_res.scalars().first.return_value = self.business
            mock_res.scalars().all.return_value = [self.business]
        return mock_res

class MockWhatsAppSession:
    def __init__(self, integration, business):
        self.integration = integration
        self.business = business
        
    async def execute(self, stmt):
        mock_res = MagicMock()
        stmt_str = str(stmt).lower()
        if "integration" in stmt_str:
            mock_res.scalars().all.return_value = [self.integration]
            mock_res.scalars().first.return_value = self.integration
        elif "business" in stmt_str:
            mock_res.scalars().first.return_value = self.business
            mock_res.scalars().all.return_value = [self.business]
        elif "systemconfiguration" in stmt_str:
            mock_res.scalars().first.return_value = None
        return mock_res

async def run_tests():
    print("--- RUNNING INTEGRATION TESTS FOR SANDBOX, TELEGRAM, & WHATSAPP GATES ---")
    client = TestClient(app)
    
    # 1. Override dependency injections
    async def override_get_current_user():
        return mock_user
        
    app.dependency_overrides[get_current_user] = override_get_current_user

    # Mock Integrations
    mock_int_tg = Integration(
        id="int_tg_123",
        business_id="biz_test_123",
        provider="telegram",
        settings={"webhook_id": "test_hook_tg_123"},
        access_token="dummy_token_tg"
    )
    mock_int_wa = Integration(
        id="int_wa_123",
        business_id="biz_test_123",
        provider="whatsapp",
        settings={"twilio_from_number": "14155238886"}
    )

    # Scenarios for Sandbox tests
    sandbox_scenarios = [
        {"name": "Prospect: Feature DISABLED, Routing ENABLED", "features_config": {"campaign_flow": {"enabled": False}}, "routing_config": {"prospective_clients": {"enabled": True}}, "simulate_role": "prospective_client", "expected_blocked": True},
        {"name": "Prospect: Feature ENABLED, Routing DISABLED", "features_config": {"campaign_flow": {"enabled": True}}, "routing_config": {"prospective_clients": {"enabled": False}}, "simulate_role": "prospective_client", "expected_blocked": True},
        {"name": "Prospect: Feature DISABLED, Routing DISABLED", "features_config": {"campaign_flow": {"enabled": False}}, "routing_config": {"prospective_clients": {"enabled": False}}, "simulate_role": "prospective_client", "expected_blocked": True},
        {"name": "Distributor: Feature DISABLED, Routing ENABLED", "features_config": {"b2b_solutions": {"enabled": False}}, "routing_config": {"distributors_retailers": {"enabled": True}}, "simulate_role": "distributor_retailer", "expected_blocked": True},
        {"name": "Distributor: Feature ENABLED, Routing DISABLED", "features_config": {"b2b_solutions": {"enabled": True}}, "routing_config": {"distributors_retailers": {"enabled": False}}, "simulate_role": "distributor_retailer", "expected_blocked": True},
        {"name": "Distributor: Feature DISABLED, Routing DISABLED", "features_config": {"b2b_solutions": {"enabled": False}}, "routing_config": {"distributors_retailers": {"enabled": False}}, "simulate_role": "distributor_retailer", "expected_blocked": True},
    ]

    print("\n[SANDBOX /test-chat TESTS]")
    for scenario in sandbox_scenarios:
        mock_biz = MockBusinessProfile(
            features_config=scenario["features_config"],
            routing_config=scenario["routing_config"]
        )
        
        with patch("app.api.business.get_full_business", new_callable=AsyncMock) as mock_get_biz:
            mock_get_biz.return_value = mock_biz
            
            response = client.post(
                "/api/v1/business/test-chat",
                json={
                    "message": "Hola, prueba de sandbox",
                    "simulate_role": scenario["simulate_role"]
                }
            )
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            res_data = response.json()
            assert res_data["response"] == "Este servicio no está habilitado actualmente para este número en la configuración de la empresa."
            print(f"✅ PASS: {scenario['name']} correctly BLOCKED in sandbox.")

    # 2. Telegram Webhook tests
    print("\n[TELEGRAM WEBHOOK TESTS]")
    tg_scenarios = [
        {"name": "Telegram: Prospect Feature DISABLED", "features_config": {"campaign_flow": {"enabled": False}}, "simulate_role": "prospective_client"},
        {"name": "Telegram: Distributor Feature DISABLED", "features_config": {"b2b_solutions": {"enabled": False}}, "simulate_role": "distributor_retailer"},
    ]
    
    for scenario in tg_scenarios:
        mock_biz = MockBusinessProfile(
            features_config=scenario["features_config"],
            routing_config={"prospective_clients": {"enabled": True}, "distributors_retailers": {"enabled": True}}
        )
        
        async def override_get_db_tg():
            yield MockTelegramSession(mock_int_tg, mock_biz)
            
        app.dependency_overrides[get_db] = override_get_db_tg
        
        with patch("app.services.identity_resolver.IdentityResolver.resolve_sender", new_callable=AsyncMock) as mock_resolve, \
             patch("app.api.telegram.decrypt_token", return_value="dummy_token") as mock_decrypt, \
             patch("app.api.telegram.TelegramService.send_message", new_callable=AsyncMock) as mock_send:
             
            mock_resolve.return_value = (scenario["simulate_role"], None)
            
            response = client.post(
                "/api/v1/telegram/webhook/test_hook_tg_123",
                json={
                    "update_id": 9999,
                    "message": {
                        "message_id": 1,
                        "chat": {"id": 12345},
                        "text": "Hola Telegram",
                        "from": {"first_name": "Test", "id": 12345}
                    }
                }
            )
            
            assert response.status_code == 200, f"Expected 200 status, got {response.status_code}"
            assert response.json() == {"status": "ok"}
            
            # Verify send_message was called with the blocked notification message
            mock_send.assert_called_once_with(
                "dummy_token", 
                12345, 
                "Este servicio no está habilitado actualmente para este número."
            )
            print(f"✅ PASS: {scenario['name']} correctly BLOCKED and sent Telegram message.")

    # 3. WhatsApp Webhook tests
    print("\n[WHATSAPP WEBHOOK TESTS]")
    wa_scenarios = [
        {"name": "WhatsApp: Prospect Feature DISABLED", "features_config": {"campaign_flow": {"enabled": False}}, "simulate_role": "prospective_client"},
        {"name": "WhatsApp: Distributor Feature DISABLED", "features_config": {"b2b_solutions": {"enabled": False}}, "simulate_role": "distributor_retailer"},
    ]
    
    for scenario in wa_scenarios:
        mock_biz = MockBusinessProfile(
            features_config=scenario["features_config"],
            routing_config={"prospective_clients": {"enabled": True}, "distributors_retailers": {"enabled": True}}
        )
        
        async def override_get_db_wa():
            yield MockWhatsAppSession(mock_int_wa, mock_biz)
            
        app.dependency_overrides[get_db] = override_get_db_wa
        
        with patch("app.services.identity_resolver.IdentityResolver.resolve_sender", new_callable=AsyncMock) as mock_resolve:
            mock_resolve.return_value = (scenario["simulate_role"], None)
            
            response = client.post(
                "/api/v1/whatsapp/webhook/twilio",
                data={
                    "From": "whatsapp:+5218132477146",
                    "To": "whatsapp:+14155238886",
                    "Body": "Hola WhatsApp"
                }
            )
            
            assert response.status_code == 200, f"Expected 200 status, got {response.status_code}"
            # Check TwiML body
            xml_content = response.text
            assert "<Response><Message>" in xml_content
            assert "Este servicio no está habilitado actualmente para este número." in xml_content
            print(f"✅ PASS: {scenario['name']} correctly BLOCKED and returned Twilio TwiML.")

    # 4. Admin promotion and initialization tests
    print("\n[ADMIN VERTICAL PROMOTION TESTS]")
    from app.models.business import VerticalType
    from app.api.admin import get_current_admin
    
    mock_biz_basic = BusinessProfile(
        id="biz_promo_123",
        user_id="user_promo_123",
        name="Promo Biz",
        vertical_type=VerticalType.BASIC,
        routing_config={"prospective_clients": {"enabled": True}},
        features_config={"scheduling": {"enabled": True}}
    )
    mock_user_promo = User(
        id="user_promo_123",
        email="promo@biz.com",
        role="client",
        business_profile=mock_biz_basic
    )
    
    class MockAdminDB:
        async def execute(self, stmt):
            mock_res = MagicMock()
            stmt_str = str(stmt).lower()
            if "business_profiles" in stmt_str:
                mock_res.scalars().first.return_value = mock_biz_basic
                mock_res.scalars().all.return_value = [mock_biz_basic]
            elif "users" in stmt_str:
                mock_res.scalars().first.return_value = mock_user_promo
                mock_res.scalars().all.return_value = [mock_user_promo]
            return mock_res
            
        async def commit(self): pass
        async def flush(self): pass
        async def add(self, obj): pass
            
    async def override_get_db_admin():
        yield MockAdminDB()
        
    async def override_get_current_admin():
        return User(id="admin_123", email="admin@sherpa.com", role="admin", is_admin=True)
        
    app.dependency_overrides[get_db] = override_get_db_admin
    app.dependency_overrides[get_current_admin] = override_get_current_admin
    
    # Test PATCH /admin/users/{user_id}
    response = client.patch(
        "/api/v1/admin/users/user_promo_123",
        json={
            "vertical_type": "TRADE"
        }
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert mock_biz_basic.vertical_type == VerticalType.TRADE
    assert mock_biz_basic.routing_config.get("distributors_retailers", {}).get("enabled") is True
    print("✅ PASS: PATCH /admin/users/{user_id} successfully promoted BASIC vertical to TRADE and upgraded routing_config.")
    
    # Reset vertical type to test business patch route
    mock_biz_basic.vertical_type = VerticalType.BASIC
    mock_biz_basic.routing_config = {"prospective_clients": {"enabled": True}}
    
    # Test PATCH /admin/businesses/{business_id}/vertical
    response = client.patch(
        "/api/v1/admin/businesses/biz_promo_123/vertical?vertical_type=TRADE"
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert mock_biz_basic.vertical_type == VerticalType.TRADE
    assert mock_biz_basic.routing_config.get("distributors_retailers", {}).get("enabled") is True
    print("✅ PASS: PATCH /admin/businesses/{business_id}/vertical successfully promoted BASIC vertical to TRADE and upgraded routing_config.")

    # Reset overrides
    app.dependency_overrides.clear()
    print("\n--- ALL SANDBOX, TELEGRAM, & WHATSAPP GATES INTEGRATION TESTS PASSED ---")

if __name__ == "__main__":
    asyncio.run(run_tests())
