import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.integration import Integration
from app.api.auth import get_current_user
from app.main import app

# Create a mock current user dependency override
mock_user = User(id="user_123", email="user@example.com")
mock_business = BusinessProfile(id="biz_123", name="My Test Business", user_id="user_123")

def override_current_user():
    return mock_user

@patch("app.services.messaging.provisioner.provision_whatsapp_sender")
def test_provision_whatsapp_api_endpoint(mock_provision_sender):
    # Mock database execute results
    mock_integration = Integration(
        provider="whatsapp",
        settings={"phone_number": "+5215555555555", "provider_type": "twilio_subaccount"}
    )
    mock_provision_sender.return_value = mock_integration
    
    # Register FastAPI overrides
    app.dependency_overrides[get_current_user] = override_current_user
    
    # We mock the database session execution with AsyncMock
    mock_session = AsyncMock()
    
    # Mock business profile lookup
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = mock_business
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    mock_session.execute.return_value = mock_result
    
    from app.core.database import get_db
    app.dependency_overrides[get_db] = lambda: mock_session
    
    try:
        client = TestClient(app)
        response = client.post(
            "/api/v1/integrations/whatsapp/provision",
            json={"area_code": "55", "friendly_name": "Test Subaccount"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["phone_number"] == "+5215555555555"
        assert data["provider_type"] == "twilio_subaccount"
        
        # Verify provision_whatsapp_sender was called
        mock_provision_sender.assert_called_once()
        
    finally:
        # Clear overrides
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)

def test_get_whatsapp_config_with_prefill():
    mock_user_with_bp = User(id="user_123", email="user@example.com")
    mock_user_with_bp.business_profile = BusinessProfile(
        id="biz_123",
        name="Abarrotes Don Pepe",
        category="RETAIL",
        user_id="user_123"
    )
    
    app.dependency_overrides[get_current_user] = lambda: mock_user_with_bp
    try:
        client = TestClient(app)
        response = client.get("/api/v1/integrations/whatsapp/config")
        assert response.status_code == 200
        data = response.json()
        assert "app_id" in data
        assert "config_id" in data
        assert data["prefill"]["business_name"] == "Abarrotes Don Pepe"
        assert data["prefill"]["category"] == "RETAIL"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

def test_get_whatsapp_config_without_business_profile():
    mock_user_no_bp = User(id="user_456", email="nobody@example.com")
    mock_user_no_bp.business_profile = None
    
    app.dependency_overrides[get_current_user] = lambda: mock_user_no_bp
    try:
        client = TestClient(app)
        response = client.get("/api/v1/integrations/whatsapp/config")
        assert response.status_code == 200
        data = response.json()
        assert "app_id" in data
        assert "config_id" in data
        assert data["prefill"] == {}
    finally:
        app.dependency_overrides.pop(get_current_user, None)

@patch("httpx.AsyncClient.post")
@patch("httpx.AsyncClient.get")
def test_meta_onboard_with_debug_token(mock_get, mock_post):
    from app.core.database import get_db
    from app.core.config import settings

    # Setup environment settings for test
    settings.META_APP_ID = "mock_app_id"
    settings.META_APP_SECRET = "mock_app_secret"
    settings.META_SYSTEM_USER_TOKEN = "mock_system_user_token"

    mock_user_with_bp = User(id="user_123", email="user@example.com")
    mock_user_with_bp.business_profile = BusinessProfile(
        id="biz_123",
        name="Abarrotes Don Pepe",
        category="RETAIL",
        user_id="user_123"
    )

    # Mock responses for httpx.get
    # 1. token exchange response
    token_response = MagicMock()
    token_response.status_code = 200
    token_response.json.return_value = {"access_token": "mock_client_token"}

    # 2. debug_token response
    debug_response = MagicMock()
    debug_response.status_code = 200
    debug_response.json.return_value = {
        "data": {
            "granular_scopes": [
                {
                    "scope": "whatsapp_business_management",
                    "target_ids": ["waba_999"]
                }
            ]
        }
    }

    # 3. phone numbers response
    phone_response = MagicMock()
    phone_response.status_code = 200
    phone_response.json.return_value = {
        "data": [
            {
                "id": "phone_id_888",
                "display_phone_number": "+52 1 55 1234 5678"
            }
        ]
    }

    async def async_get(url, *args, **kwargs):
        if "oauth/access_token" in str(url):
            return token_response
        elif "debug_token" in str(url):
            return debug_response
        elif "phone_numbers" in str(url):
            return phone_response
        return MagicMock(status_code=404, json=lambda: {})

    mock_get.side_effect = async_get

    # Mock register/subscribe post calls
    reg_response = MagicMock()
    reg_response.status_code = 200
    reg_response.json.return_value = {"success": True}
    mock_post.return_value = reg_response

    # Mock DB session
    mock_session = AsyncMock()
    mock_bp_scalars = MagicMock()
    mock_bp_scalars.first.return_value = mock_user_with_bp.business_profile
    mock_bp_result = MagicMock()
    mock_bp_result.scalars.return_value = mock_bp_scalars

    mock_int_scalars = MagicMock()
    mock_int_scalars.first.return_value = None
    mock_int_result = MagicMock()
    mock_int_result.scalars.return_value = mock_int_scalars

    mock_session.execute.side_effect = [mock_bp_result, mock_int_result]

    app.dependency_overrides[get_current_user] = lambda: mock_user_with_bp
    app.dependency_overrides[get_db] = lambda: mock_session

    try:
        client = TestClient(app)
        response = client.post(
            "/api/v1/integrations/whatsapp/meta-onboard",
            json={"code": "mock_auth_code"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["phone_number"] == "+5215512345678"
        assert data["provider_type"] == "meta_cloud_api"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)

