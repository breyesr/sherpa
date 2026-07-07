import pytest
from unittest.mock import MagicMock, patch
from app.models.integration import Integration
from app.services.messaging import MessagingService
from app.core.encryption import encrypt_value

def test_tenant_isolation_no_data_leakage():
    # Setup two completely separate integrations with distinct encrypted tokens
    encrypted_token_1 = encrypt_value("secret_token_tenant_1")
    encrypted_token_2 = encrypt_value("secret_token_tenant_2")
    
    integration_1 = Integration(
        id="integration_id_1",
        business_id="biz_1",
        provider="whatsapp",
        settings={
            "provider_type": "twilio_subaccount",
            "subaccount_sid": "AC_TENANT_1",
            "auth_token_encrypted": encrypted_token_1,
            "phone_number": "+521111111111"
        }
    )
    
    integration_2 = Integration(
        id="integration_id_2",
        business_id="biz_2",
        provider="whatsapp",
        settings={
            "provider_type": "twilio_subaccount",
            "subaccount_sid": "AC_TENANT_2",
            "auth_token_encrypted": encrypted_token_2,
            "phone_number": "+521222222222"
        }
    )
    
    with patch("app.services.messaging.twilio_engine.Client") as mock_client_cls:
        # Resolve engine 1
        engine_1 = MessagingService.get_engine(integration_1)
        assert engine_1.subaccount_sid == "AC_TENANT_1"
        assert engine_1.phone_number == "+521111111111"
        assert engine_1.auth_token == "secret_token_tenant_1"
        
        # Resolve engine 2
        engine_2 = MessagingService.get_engine(integration_2)
        assert engine_2.subaccount_sid == "AC_TENANT_2"
        assert engine_2.phone_number == "+521222222222"
        assert engine_2.auth_token == "secret_token_tenant_2"
        
        # Verify separate Client instances were created with isolated tokens
        assert mock_client_cls.call_count == 2
        mock_client_cls.assert_any_call("AC_TENANT_1", "secret_token_tenant_1")
        mock_client_cls.assert_any_call("AC_TENANT_2", "secret_token_tenant_2")
