import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from app.models.business import BusinessProfile
from app.models.integration import Integration
from app.main import app

@pytest.mark.anyio
@patch("app.services.identity_resolver.IdentityResolver.resolve_sender")
@patch("app.tasks.messages.process_customer_message")
@patch("app.tasks.messages.process_prospect_message")
async def test_inbound_webhook_routing_isolation(
    mock_process_prospect,
    mock_process_customer,
    mock_resolve_sender
):
    # Setup mock businesses
    biz_1 = BusinessProfile(id="biz_id_1", name="Tenant Business 1")
    biz_2 = BusinessProfile(id="biz_id_2", name="Tenant Business 2")
    
    # Setup mock integrations matching two different phone numbers
    integration_1 = Integration(
        id="int_1",
        business_id=biz_1.id,
        provider="whatsapp",
        settings={
            "phone_number": "+521111111111",
            "provider_type": "twilio_subaccount",
            "subaccount_sid": "AC_SUB_1",
            "auth_token_encrypted": "encrypted_token_1"
        }
    )
    
    # Model configuration needs to have twilio_from_number clean
    integration_2 = Integration(
        id="int_2",
        business_id=biz_2.id,
        provider="whatsapp",
        settings={
            "phone_number": "+521222222222",
            "provider_type": "twilio_subaccount",
            "subaccount_sid": "AC_SUB_2",
            "auth_token_encrypted": "encrypted_token_2"
        }
    )
    
    # Mock IdentityResolver to return a simple customer
    mock_resolve_sender.return_value = ("customer", MagicMock(id="client_123"))
    
    # Mock database session execution
    mock_session = AsyncMock()
    
    # First query fetches all integrations where provider == 'whatsapp'
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [integration_1, integration_2]
    mock_result_all = MagicMock()
    mock_result_all.scalars.return_value = mock_scalars
    
    def mock_db_execute(stmt):
        stmt_str = str(stmt).lower()
        if "from integrations" in stmt_str:
            return mock_result_all
        elif "from business_profiles" in stmt_str:
            params = stmt.compile().params
            mock_biz_scalar = MagicMock()
            if "biz_id_1" in params.values():
                mock_biz_scalar.first.return_value = biz_1
            else:
                mock_biz_scalar.first.return_value = biz_2
            mock_biz_result = MagicMock()
            mock_biz_result.scalars.return_value = mock_biz_scalar
            return mock_biz_result
        return MagicMock()
        
    mock_session.execute.side_effect = mock_db_execute
    
    # Override database session dependency
    from app.core.database import get_db
    app.dependency_overrides[get_db] = lambda: mock_session
    
    try:
        client = TestClient(app)
        
        # 1. Send message to Tenant 1's number
        payload_1 = {
            "From": "+521999999999",
            "To": "+521111111111",
            "Body": "Hello Business 1!",
            "ProfileName": "Client A"
        }
        response_1 = client.post(
            "/api/v1/whatsapp/webhook/twilio",
            data=payload_1
        )
        assert response_1.status_code == 200
        
        # Verify routed to Business 1
        mock_process_customer.apply_async.assert_called_once()
        args, kwargs = mock_process_customer.apply_async.call_args
        assert kwargs["args"][0] == "biz_id_1"
        assert kwargs["args"][2]["Body"] == "Hello Business 1!"
        
        # Reset mock
        mock_process_customer.apply_async.reset_mock()
        
        # 2. Send message to Tenant 2's number
        payload_2 = {
            "From": "+521999999999",
            "To": "+521222222222",
            "Body": "Hello Business 2!",
            "ProfileName": "Client A"
        }
        response_2 = client.post(
            "/api/v1/whatsapp/webhook/twilio",
            data=payload_2
        )
        assert response_2.status_code == 200
        
        # Verify routed to Business 2
        mock_process_customer.apply_async.assert_called_once()
        args, kwargs = mock_process_customer.apply_async.call_args
        assert kwargs["args"][0] == "biz_id_2"
        assert kwargs["args"][2]["Body"] == "Hello Business 2!"
        
        # 3. Send message to an unmapped number (should return 404 cleanly)
        payload_unmapped = {
            "From": "+521999999999",
            "To": "+521888888888",
            "Body": "Hello Stranger!",
            "ProfileName": "Client A"
        }
        response_unmapped = client.post(
            "/api/v1/whatsapp/webhook/twilio",
            data=payload_unmapped
        )
        assert response_unmapped.status_code == 404
        assert response_unmapped.text == "Sender registration unmapped."
        
    finally:
        app.dependency_overrides.pop(get_db, None)
