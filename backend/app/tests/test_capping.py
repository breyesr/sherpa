import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from app.models.business import BusinessProfile
from app.models.integration import Integration
from app.main import app

@pytest.mark.anyio
@patch("app.core.limiter._get_redis_client")
async def test_redis_usage_counter(mock_get_redis):
    # Mock Redis client
    mock_redis = AsyncMock()
    mock_get_redis.return_value = mock_redis
    
    from app.core.limiter import get_whatsapp_usage, increment_whatsapp_usage
    
    # Test get_whatsapp_usage
    mock_redis.get.return_value = b"45"
    used = await get_whatsapp_usage("biz_123")
    assert used == 45
    
    mock_redis.get.return_value = None
    used_none = await get_whatsapp_usage("biz_123")
    assert used_none == 0
    
    # Test increment_whatsapp_usage
    mock_redis.incr.return_value = 1
    val = await increment_whatsapp_usage("biz_123")
    assert val == 1
    mock_redis.expire.assert_called_once()
    
    mock_redis.expire.reset_mock()
    mock_redis.incr.return_value = 50
    val_50 = await increment_whatsapp_usage("biz_123")
    assert val_50 == 50
    mock_redis.expire.assert_not_called()

@pytest.mark.anyio
@patch("app.core.limiter.increment_whatsapp_usage")
@patch("app.core.limiter.check_and_send_usage_alert")
async def test_process_usage_and_check_gate_under_limit(
    mock_send_alert,
    mock_increment
):
    biz = BusinessProfile(id="biz_123", purchased_credits=50)
    mock_session = AsyncMock()
    
    # Mock business query
    mock_biz_scalar = MagicMock()
    mock_biz_scalar.first.return_value = biz
    mock_biz_result = MagicMock()
    mock_biz_result.scalars.return_value = mock_biz_scalar
    mock_session.execute.return_value = mock_biz_result
    
    # 1. Message under 80% (Limit is 200 + 50 = 250. 80% is 200. Let's say used is 100)
    mock_increment.return_value = 100
    
    from app.core.limiter import process_usage_and_check_gate
    allowed = await process_usage_and_check_gate(mock_session, "biz_123", {"Body": "Hello"}, "client_abc")
    assert allowed is True
    mock_send_alert.assert_not_called()

@pytest.mark.anyio
@patch("app.core.limiter.increment_whatsapp_usage")
@patch("app.core.limiter.check_and_send_usage_alert")
async def test_process_usage_and_check_gate_alerts(
    mock_send_alert,
    mock_increment
):
    biz = BusinessProfile(id="biz_123", purchased_credits=0) # limit is 200, 80% is 160
    mock_session = AsyncMock()
    
    mock_biz_scalar = MagicMock()
    mock_biz_scalar.first.return_value = biz
    mock_biz_result = MagicMock()
    mock_biz_result.scalars.return_value = mock_biz_scalar
    mock_session.execute.return_value = mock_biz_result
    
    # 1. 80% threshold alert (used = 170)
    mock_increment.return_value = 170
    from app.core.limiter import process_usage_and_check_gate
    allowed = await process_usage_and_check_gate(mock_session, "biz_123", {"Body": "Hello"}, "client_abc")
    assert allowed is True
    mock_send_alert.assert_called_once_with(mock_session, biz, 170, 200, threshold="80")
    
    mock_send_alert.reset_mock()
    
    # 2. 100% threshold alert (used = 200)
    mock_increment.return_value = 200
    allowed_100 = await process_usage_and_check_gate(mock_session, "biz_123", {"Body": "Hello"}, "client_abc")
    assert allowed_100 is True
    mock_send_alert.assert_called_once_with(mock_session, biz, 200, 200, threshold="100")

@pytest.mark.anyio
@patch("app.core.limiter.increment_whatsapp_usage")
@patch("app.core.limiter.check_and_send_usage_alert")
async def test_process_usage_and_check_gate_blocked(
    mock_send_alert,
    mock_increment
):
    biz = BusinessProfile(id="biz_123", purchased_credits=0) # limit is 200
    mock_session = AsyncMock()
    
    # Mock business profile query
    mock_biz_scalar = MagicMock()
    mock_biz_scalar.first.return_value = biz
    mock_biz_result = MagicMock()
    mock_biz_result.scalars.return_value = mock_biz_scalar
    
    # Mock conversation query
    mock_conv_scalar = MagicMock()
    mock_conv_scalar.first.return_value = None # No existing conversation
    mock_conv_result = MagicMock()
    mock_conv_result.scalars.return_value = mock_conv_scalar
    
    def mock_execute(stmt):
        stmt_str = str(stmt).lower()
        if "business_profiles" in stmt_str:
            return mock_biz_result
        else:
            return mock_conv_result
            
    mock_session.execute.side_effect = mock_execute
    
    # Over limit (used = 201)
    mock_increment.return_value = 201
    
    from app.core.limiter import process_usage_and_check_gate
    allowed = await process_usage_and_check_gate(mock_session, "biz_123", {"From": "whatsapp:+5219999", "To": "+521888", "Body": "Blocked!"}, "client_abc")
    assert allowed is False
    
    # Verify that conversation and user message were added/stored in DB
    assert mock_session.add.call_count == 2 # 1 for conversation, 1 for message
    mock_session.commit.assert_called_once()

@pytest.mark.anyio
async def test_usage_and_admin_api_endpoints():
    mock_session = AsyncMock()
    
    # Setup mock business profile
    biz = BusinessProfile(id="biz_123", user_id="user_abc", purchased_credits=150)
    mock_biz_scalar = MagicMock()
    mock_biz_scalar.first.return_value = biz
    mock_biz_result = MagicMock()
    mock_biz_result.scalars.return_value = mock_biz_scalar
    mock_session.execute.return_value = mock_biz_result
    
    # Mock get_current_user / admin
    current_user = MagicMock(id="user_abc", role="client", is_admin=False)
    
    # Override FastAPI dependencies
    from app.core.database import get_db
    from app.api.auth import get_current_user
    app.dependency_overrides[get_db] = lambda: mock_session
    app.dependency_overrides[get_current_user] = lambda: current_user
    
    try:
        client = TestClient(app)
        
        # Mock Redis usage counter inside integrations API
        with patch("app.core.limiter.get_whatsapp_usage", return_value=120):
            response = client.get("/api/v1/integrations/whatsapp/usage/biz_123")
            assert response.status_code == 200
            data = response.json()
            assert data["used"] == 120
            assert data["free_limit"] == 200
            assert data["purchased"] == 150
            assert data["total_limit"] == 350
            assert data["remaining"] == 230
            assert data["percent_used"] == 34.3
            
        # Test admin update credits endpoint
        admin_user = MagicMock(id="admin_123", role="super_admin", is_admin=True)
        app.dependency_overrides[get_current_user] = lambda: admin_user
        
        patch_response = client.patch(
            "/api/v1/admin/businesses/biz_123/credits",
            json={"purchased_credits": 250}
        )
        assert patch_response.status_code == 200
        patch_data = patch_response.json()
        assert patch_data["status"] == "success"
        assert patch_data["purchased_credits"] == 250
        assert biz.purchased_credits == 250
        
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)
