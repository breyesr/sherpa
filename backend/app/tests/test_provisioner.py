import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.integration import Integration
from app.services.messaging.provisioner import provision_whatsapp_sender, alert_superadmin
from app.core.encryption import decrypt_value

@pytest.mark.anyio
@patch("app.services.messaging.provisioner.create_twilio_subaccount")
@patch("app.services.messaging.provisioner.buy_mexican_number")
@patch("app.services.messaging.MessagingService")
async def test_provision_whatsapp_sender_success(
    mock_messaging_service_cls,
    mock_buy_number,
    mock_create_subaccount
):
    # Mock Twilio subaccount and number purchase functions
    mock_create_subaccount.return_value = ("AC_SUB_123", "AUTH_TOKEN_SUB_123")
    mock_buy_number.return_value = "+5215555555555"
    
    # Mock MessagingService & Webhook Engine
    mock_engine = MagicMock()
    mock_messaging_service_cls.get_engine.return_value = mock_engine
    
    # Mock DB Session
    mock_db = MagicMock(spec=AsyncSession)
    
    # Setup database query result for existing Integration (None)
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = None
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    mock_db.execute.return_value = mock_result
    
    # Execute provisioner
    integration = await provision_whatsapp_sender(
        db=mock_db,
        business_id="biz_1",
        friendly_name="Test Biz",
        area_code="55"
    )
    
    # Assert integration record updated
    assert integration is not None
    assert integration.provider == "whatsapp"
    assert integration.settings["status"] == "connected"
    assert integration.settings["subaccount_sid"] == "AC_SUB_123"
    assert integration.settings["phone_number"] == "+5215555555555"
    assert integration.settings["twilio_from_number"] == "+5215555555555"
    assert decrypt_value(integration.settings["auth_token_encrypted"]) == "AUTH_TOKEN_SUB_123"
    
    # Assert webhook registration was triggered
    mock_messaging_service_cls.get_engine.assert_called_once_with(integration)
    mock_engine.register_webhook.assert_called_once()
    mock_db.commit.assert_called()

@pytest.mark.anyio
@patch("app.services.messaging.provisioner.create_twilio_subaccount")
@patch("app.services.messaging.provisioner.asyncio.sleep")
@patch("app.services.messaging.provisioner.alert_superadmin")
async def test_provision_whatsapp_sender_failure_retries_and_alerts(
    mock_alert,
    mock_sleep,
    mock_create_subaccount
):
    # Setup subaccount creation to raise exception (forcing failure)
    mock_create_subaccount.side_effect = Exception("Twilio API Error")
    
    # Mock DB Session
    mock_db = MagicMock(spec=AsyncSession)
    placeholder_integration = Integration(provider="whatsapp", settings={})
    
    # Setup database query result for existing Integration (Mock Integration)
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = placeholder_integration
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    mock_db.execute.return_value = mock_result
    
    with pytest.raises(Exception, match="WhatsApp provisioning failed: Twilio API Error"):
        await provision_whatsapp_sender(
            db=mock_db,
            business_id="biz_1",
            friendly_name="Test Biz"
        )
        
    # Assert create_twilio_subaccount called exactly 3 times (due to 3 attempts limit)
    assert mock_create_subaccount.call_count == 3
    # Assert we slept 2 times during retries
    assert mock_sleep.call_count == 2
    
    # Assert integration status updated to error
    assert placeholder_integration.settings["status"] == "error"
    assert "Twilio API Error" in placeholder_integration.settings["error_message"]
    
    # Assert Superadmin alert called
    mock_alert.assert_called_once_with(
        business_id="biz_1",
        message="Automated WhatsApp subaccount provisioning failed.",
        error_details="Twilio API Error"
    )
    mock_db.commit.assert_called()
