import pytest
from unittest.mock import MagicMock, patch
from app.models.integration import Integration
from app.services.messaging import MessagingService
from app.services.messaging.twilio_engine import TwilioSubaccountEngine
from app.core.encryption import encrypt_value

def test_messaging_service_resolves_twilio_engine():
    encrypted_token = encrypt_value("my_auth_token_abc")
    integration = Integration(
        provider="whatsapp",
        settings={
            "provider_type": "twilio_subaccount",
            "subaccount_sid": "AC123456",
            "auth_token_encrypted": encrypted_token,
            "phone_number": "+521234567890"
        }
    )
    
    with patch("app.services.messaging.twilio_engine.Client") as mock_client_cls:
        engine = MessagingService.get_engine(integration)
        assert isinstance(engine, TwilioSubaccountEngine)
        assert engine.subaccount_sid == "AC123456"
        assert engine.phone_number == "+521234567890"
        assert engine.auth_token == "my_auth_token_abc"
        mock_client_cls.assert_called_once_with("AC123456", "my_auth_token_abc")

@pytest.mark.anyio
@patch("app.services.messaging.twilio_engine.Client")
async def test_twilio_engine_send_text(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    
    engine = TwilioSubaccountEngine(
        subaccount_sid="AC123456",
        auth_token_encrypted=encrypt_value("my_token"),
        phone_number="+521234567890"
    )
    
    success = await engine.send_text("+521987654321", "Hello there!")
    assert success is True
    mock_client.messages.create.assert_called_once_with(
        body="Hello there!",
        from_="whatsapp:+521234567890",
        to="whatsapp:+521987654321"
    )

@pytest.mark.anyio
@patch("app.services.messaging.twilio_engine.Client")
async def test_twilio_engine_send_media(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    
    engine = TwilioSubaccountEngine(
        subaccount_sid="AC123456",
        auth_token_encrypted=encrypt_value("my_token"),
        phone_number="+521234567890"
    )
    
    success = await engine.send_media("+521987654321", "https://example.com/image.jpg", caption="My Caption")
    assert success is True
    mock_client.messages.create.assert_called_once_with(
        media_url=["https://example.com/image.jpg"],
        body="My Caption",
        from_="whatsapp:+521234567890",
        to="whatsapp:+521987654321"
    )

@pytest.mark.anyio
@patch("app.services.messaging.twilio_engine.Client")
async def test_twilio_engine_register_webhook_success(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    
    engine = TwilioSubaccountEngine(
        subaccount_sid="AC123456",
        auth_token_encrypted=encrypt_value("my_token"),
        phone_number="+521234567890"
    )
    
    mock_number = MagicMock()
    mock_number.sid = "PN12345"
    mock_client.incoming_phone_numbers.list.return_value = [mock_number]
    
    success = await engine.register_webhook("https://my-webhook.com")
    assert success is True
    
    mock_client.incoming_phone_numbers.list.assert_called_with(phone_number="+521234567890")
    mock_client.incoming_phone_numbers.assert_called_with("PN12345")
    mock_client.incoming_phone_numbers("PN12345").update.assert_called_once_with(
        sms_url="https://my-webhook.com",
        sms_method="POST"
    )
