import pytest
import json
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.integration import Integration
from app.models.crm import Client
from app.api.auth import get_current_user
from app.main import app

mock_user = User(id="user_123", email="user@example.com")
mock_business = BusinessProfile(
    id="biz_123",
    name="Test Business",
    user_id="user_123",
    contact_phone="5218132477146",
    vertical_type="TRADE"
)
mock_integration = Integration(
    id="int_123",
    business_id="biz_123",
    provider="telegram",
    access_token="gAAAAAB...",  # encrypted dummy token
    settings={
        "webhook_id": "tg-webhook-uuid",
        "bot_username": "TestBot",
        "bot_name": "Test Bot"
    }
)

def override_current_user():
    return mock_user

@pytest.mark.anyio
@patch("app.core.limiter._get_redis_client")
async def test_generate_bind_token_endpoint(mock_get_redis):
    # Mock Redis client
    mock_redis = AsyncMock()
    mock_get_redis.return_value = mock_redis
    
    app.dependency_overrides[get_current_user] = override_current_user
    
    # Mock database lookup
    mock_session = AsyncMock()
    mock_scalars_biz = MagicMock()
    mock_scalars_biz.first.return_value = mock_business
    mock_result_biz = MagicMock()
    mock_result_biz.scalars.return_value = mock_scalars_biz
    
    mock_scalars_int = MagicMock()
    mock_scalars_int.first.return_value = mock_integration
    mock_result_int = MagicMock()
    mock_result_int.scalars.return_value = mock_scalars_int
    
    def mock_db_execute(stmt):
        stmt_str = str(stmt).lower()
        if "from business_profiles" in stmt_str:
            return mock_result_biz
        elif "from integrations" in stmt_str:
            return mock_result_int
        return MagicMock()
        
    mock_session.execute.side_effect = mock_db_execute
    
    from app.core.database import get_db
    app.dependency_overrides[get_db] = lambda: mock_session
    
    try:
        client = TestClient(app)
        response = client.post("/api/v1/telegram/generate-bind-token")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "token" in data
        assert data["bot_username"] == "TestBot"
        assert "deep_link_url" in data
        assert f"https://t.me/TestBot?start=" in data["deep_link_url"]
        
        # Verify stored in Redis with 10-minute TTL
        mock_redis.set.assert_called_once()
        args, kwargs = mock_redis.set.call_args
        assert kwargs["ex"] == 600
        
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)

@pytest.mark.anyio
@patch("app.core.limiter._get_redis_client")
@patch("app.core.telegram_service.TelegramService.send_message")
async def test_webhook_start_admin_bind(mock_send_msg, mock_get_redis):
    # Mock Redis client
    mock_redis = AsyncMock()
    mock_redis.get.return_value = json.dumps({
        "business_id": "biz_123",
        "user_id": "user_123"
    }).encode("utf-8")
    mock_get_redis.return_value = mock_redis
    
    # Mock DB session execution
    mock_session = AsyncMock()
    
    # We query integrations (webhook lookup) and business profile
    mock_scalars_int = MagicMock()
    mock_scalars_int.all.return_value = [mock_integration]
    mock_result_int = MagicMock()
    mock_result_int.scalars.return_value = mock_scalars_int
    
    mock_scalars_biz = MagicMock()
    mock_scalars_biz.first.return_value = mock_business
    mock_result_biz = MagicMock()
    mock_result_biz.scalars.return_value = mock_scalars_biz
    
    def mock_db_execute(stmt):
        stmt_str = str(stmt).lower()
        if "from integrations" in stmt_str:
            return mock_result_int
        elif "from business_profiles" in stmt_str:
            return mock_result_biz
        return MagicMock()
        
    mock_session.execute.side_effect = mock_db_execute
    
    from app.core.database import get_db
    app.dependency_overrides[get_db] = lambda: mock_session
    
    try:
        client = TestClient(app)
        payload = {
            "update_id": 100,
            "message": {
                "message_id": 1,
                "from": {"id": 999888, "is_bot": False, "first_name": "AdminUser"},
                "chat": {"id": 999888, "type": "private"},
                "text": "/start admin_bind_token123"
            }
        }
        
        response = client.post("/api/v1/telegram/webhook/tg-webhook-uuid", json=payload)
        assert response.status_code == 200
        
        # Verify admin_telegram_id was saved to integration settings
        assert mock_integration.settings.get("admin_telegram_id") == "999888"
        
        # Verify redis clean up
        mock_redis.delete.assert_called_once_with("tg_bind:admin_bind_token123")
        
        # Verify success message sent
        mock_send_msg.assert_called_once()
        args, kwargs = mock_send_msg.call_args
        assert "success" in args[2].lower() or "exitosa" in args[2].lower()
        
    finally:
        app.dependency_overrides.pop(get_db, None)

@pytest.mark.anyio
@patch("app.core.limiter._get_redis_client")
@patch("app.core.telegram_service.TelegramService.send_message")
async def test_webhook_contact_share_admin(mock_send_msg, mock_get_redis):
    mock_redis = AsyncMock()
    mock_get_redis.return_value = mock_redis
    
    mock_session = AsyncMock()
    
    # Webhook integration check queries
    mock_scalars_int = MagicMock()
    mock_scalars_int.all.return_value = [mock_integration]
    mock_result_int = MagicMock()
    mock_result_int.scalars.return_value = mock_scalars_int
    
    mock_scalars_biz = MagicMock()
    mock_scalars_biz.first.return_value = mock_business
    mock_result_biz = MagicMock()
    mock_result_biz.scalars.return_value = mock_scalars_biz
    
    # Client query (look for admin by phone)
    mock_scalars_cli = MagicMock()
    mock_scalars_cli.first.return_value = None  # Force creation of client
    mock_result_cli = MagicMock()
    mock_result_cli.scalars.return_value = mock_scalars_cli
    
    def mock_db_execute(stmt):
        stmt_str = str(stmt).lower()
        if "from integrations" in stmt_str:
            return mock_result_int
        elif "from business_profiles" in stmt_str:
            return mock_result_biz
        elif "from clients" in stmt_str:
            return mock_result_cli
        return MagicMock()
        
    mock_session.execute.side_effect = mock_db_execute
    
    from app.core.database import get_db
    app.dependency_overrides[get_db] = lambda: mock_session
    
    try:
        client = TestClient(app)
        payload = {
            "update_id": 101,
            "message": {
                "message_id": 2,
                "from": {"id": 999888, "is_bot": False, "first_name": "AdminUser"},
                "chat": {"id": 999888, "type": "private"},
                "contact": {
                    "phone_number": "5218132477146",
                    "first_name": "AdminUser",
                    "user_id": 999888
                }
            }
        }
        
        response = client.post("/api/v1/telegram/webhook/tg-webhook-uuid", json=payload)
        assert response.status_code == 200
        
        # Verify mapped to admin_telegram_id in integration
        assert mock_integration.settings.get("admin_telegram_id") == "999888"
        
        # Verify success message and remove keyboard sent
        mock_send_msg.assert_called_once()
        args, kwargs = mock_send_msg.call_args
        assert kwargs.get("reply_markup") == {"remove_keyboard": True}
        
    finally:
        app.dependency_overrides.pop(get_db, None)

@pytest.mark.anyio
@patch("app.core.limiter._get_redis_client")
@patch("app.core.telegram_service.TelegramService.send_message")
@patch("app.services.identity_resolver.IdentityResolver.resolve_sender")
async def test_webhook_contact_prompt_fallback(mock_resolve, mock_send_msg, mock_get_redis):
    # Mock Redis client
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None  # Not yet prompted
    mock_get_redis.return_value = mock_redis
    
    # Mock resolve_sender to say unknown/prospective with no client
    mock_resolve.return_value = ("prospective_client", None)
    
    mock_session = AsyncMock()
    mock_scalars_int = MagicMock()
    mock_scalars_int.all.return_value = [mock_integration]
    mock_result_int = MagicMock()
    mock_result_int.scalars.return_value = mock_scalars_int
    
    mock_scalars_biz = MagicMock()
    mock_scalars_biz.first.return_value = mock_business
    mock_result_biz = MagicMock()
    mock_result_biz.scalars.return_value = mock_scalars_biz
    
    def mock_db_execute(stmt):
        stmt_str = str(stmt).lower()
        if "from integrations" in stmt_str:
            return mock_result_int
        elif "from business_profiles" in stmt_str:
            return mock_result_biz
        return MagicMock()
        
    mock_session.execute.side_effect = mock_db_execute
    
    from app.core.database import get_db
    app.dependency_overrides[get_db] = lambda: mock_session
    
    try:
        client = TestClient(app)
        
        # 1. Send first message - should prompt for contact
        payload_1 = {
            "update_id": 102,
            "message": {
                "message_id": 3,
                "from": {"id": 111222, "is_bot": False, "first_name": "Stranger"},
                "chat": {"id": 111222, "type": "private"},
                "text": "Hola"
            }
        }
        response_1 = client.post("/api/v1/telegram/webhook/tg-webhook-uuid", json=payload_1)
        assert response_1.status_code == 200
        
        # Verify redis key set to remember prompt
        mock_redis.set.assert_called_once()
        assert "tg_contact_prompt:111222" in mock_redis.set.call_args[0][0]
        
        # Verify message sent with request_contact keyboard markup
        mock_send_msg.assert_called_once()
        args, kwargs = mock_send_msg.call_args
        assert "keyboard" in kwargs.get("reply_markup", {})
        assert kwargs["reply_markup"]["keyboard"][0][0]["request_contact"] is True
        
    finally:
        app.dependency_overrides.pop(get_db, None)

@pytest.mark.anyio
async def test_bind_status_endpoint():
    mock_session = AsyncMock()
    
    mock_scalars_biz = MagicMock()
    mock_scalars_biz.first.return_value = mock_business
    mock_result_biz = MagicMock()
    mock_result_biz.scalars.return_value = mock_scalars_biz
    
    # Mock integration with admin_telegram_id set
    mock_int_linked = MagicMock()
    mock_int_linked.settings = {"admin_telegram_id": "12345", "bot_username": "test_bot"}
    mock_scalars_int = MagicMock()
    mock_scalars_int.first.return_value = mock_int_linked
    mock_result_int = MagicMock()
    mock_result_int.scalars.return_value = mock_scalars_int
    
    def mock_db_execute(stmt):
        stmt_str = str(stmt).lower()
        if "from integrations" in stmt_str:
            return mock_result_int
        elif "from business_profiles" in stmt_str:
            return mock_result_biz
        return MagicMock()
        
    mock_session.execute.side_effect = mock_db_execute
    
    from app.core.database import get_db
    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_db] = lambda: mock_session
    
    try:
        client = TestClient(app)
        response = client.get("/api/v1/telegram/bind-status")
        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is True
        assert data["admin_linked"] is True
        assert data["admin_telegram_id"] == "12345"
        assert data["bot_username"] == "test_bot"
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)
