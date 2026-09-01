import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from app.models.crm import Client
from app.models.business import BusinessProfile, Agent
from app.services.calendar_tools import CalendarToolKit
from app.services.trade_tools import TradeToolKit
from app.core.ai_service import AIService


@pytest.mark.asyncio
async def test_calendar_toolkit_blocks_anonymous_appointment():
    """Verify that create_appointment in CalendarToolKit rejects anonymous/placeholder clients."""
    db = AsyncMock()
    biz = MagicMock(spec=BusinessProfile)
    biz.id = "biz-123"
    biz.timezone = "America/Mexico_City"
    
    toolkit = CalendarToolKit(biz, db)
    
    # Mock client with placeholder name
    mock_client = MagicMock(spec=Client)
    mock_client.id = "client-1"
    mock_client.name = "TG_123456"
    
    with patch.object(toolkit, "_get_client", return_value=mock_client):
        res = await toolkit.create_appointment("123456", "2026-09-02T10:00:00")
        assert res["success"] is False
        assert "Client identity incomplete" in res["error"]


@pytest.mark.asyncio
async def test_ai_service_blocks_anonymous_appointment():
    """Verify that _create_appointment_tool in AIService rejects clients without full names."""
    db = AsyncMock()
    biz = MagicMock(spec=BusinessProfile)
    biz.id = "biz-123"
    biz.timezone = "UTC"
    biz.agents = []
    biz.vertical_type = "BASIC"
    
    ai_service = AIService(biz, db)
    
    # Mock client with placeholder name
    mock_client = MagicMock(spec=Client)
    mock_client.id = "client-1"
    mock_client.name = "WA_5215555555"
    
    with patch.object(ai_service, "_check_client_direct", return_value=mock_client):
        res = await ai_service._create_appointment_tool("5215555555", "2026-09-02T10:00:00")
        assert "Cannot book appointment: Client identity incomplete" in res


@pytest.mark.asyncio
async def test_update_client_metadata_blocks_reserved_keys():
    """Verify that _update_client_metadata_tool blocks attempts to overwrite reserved system keys."""
    db = AsyncMock()
    biz = MagicMock(spec=BusinessProfile)
    biz.id = "biz-123"
    biz.agents = []
    
    ai_service = AIService(biz, db)
    
    mock_client = MagicMock(spec=Client)
    mock_client.id = "client-1"
    mock_client.custom_fields = {"existing_note": "likes coffee"}
    
    with patch.object(ai_service, "_check_client_direct", return_value=mock_client):
        # Attempt to set both valid and malicious keys
        res = await ai_service._update_client_metadata_tool(
            "client-1",
            {
                "pet_name": "Fido",
                "is_admin": True,
                "role": "super_admin",
                "password_hash": "hacked"
            }
        )
        assert "SUCCESS" in res
        assert "pet_name" in res
        assert "is_admin" not in res
        assert "role" not in res
        # Verify custom_fields only updated valid key
        assert mock_client.custom_fields["pet_name"] == "Fido"
        assert "is_admin" not in mock_client.custom_fields
        assert "role" not in mock_client.custom_fields
        assert "password_hash" not in mock_client.custom_fields


@pytest.mark.asyncio
async def test_trade_toolkit_log_field_report_requires_store_id():
    """Verify that log_field_report rejects logging if store_id is missing."""
    db = AsyncMock()
    toolkit = TradeToolKit(db)
    
    res = await toolkit.log_field_report("biz-123", "Found competitor promo", store_id=None)
    assert res["success"] is False
    assert "store_id is required" in res["error"]
