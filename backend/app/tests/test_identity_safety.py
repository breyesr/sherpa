import pytest
from datetime import datetime
from unittest.mock import MagicMock, AsyncMock, patch
from app.models.crm import Client
from app.models.trade import Store
from app.services.identity_resolver import IdentityResolver
from app.services.agentic_orchestrator import AgenticOrchestrator
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.models.business import BusinessProfile

@pytest.mark.anyio
async def test_identity_resolver_prospect_guard():
    # Test that client with is_prospect=True and stores resolves to prospective_client
    mock_db = AsyncMock()
    
    # Mock client and stores
    mock_store = MagicMock(spec=Store)
    mock_client = MagicMock(spec=Client)
    mock_client.is_prospect = True
    mock_client.role = None
    mock_client.stores = [mock_store]
    # Set phone number different from business contact phone to avoid triggering sales rep fallback
    mock_client.phone = "5215555555555"
    
    # Mock database lookup
    def mock_db_execute(stmt):
        stmt_str = str(stmt).lower()
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_result.scalars.return_value = mock_scalars
        
        if "business_profiles" in stmt_str:
            mock_scalars.first.return_value = MagicMock(vertical_type="TRADE", contact_phone="5218132477146")
        elif "clients" in stmt_str:
            mock_scalars.first.return_value = mock_client
        return mock_result
        
    mock_db.execute.side_effect = mock_db_execute
    
    role, resolved_client = await IdentityResolver.resolve_sender(
        db=mock_db,
        business_id="biz_123",
        platform_id="5215555555555",
        is_telegram=False
    )
    
    assert role == "prospective_client"
    assert resolved_client == mock_client

@pytest.mark.anyio
@patch("app.services.agentic_orchestrator.AsyncPostgresSaver")
@patch("app.services.agentic_orchestrator.AsyncConnectionPool")
async def test_orchestrator_sales_rep_context_decoupling(mock_pool, mock_saver):
    # Mock setup
    orchestrator = AgenticOrchestrator(db=AsyncMock())
    orchestrator.memory = AsyncMock()
    orchestrator.memory.get_metadata.return_value = {"active_store_id": "store_123"}
    
    mock_client = MagicMock(spec=Client)
    mock_client.role = "sales_rep"
    
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = mock_client
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    orchestrator.db.execute.return_value = mock_result
    
    # Mock AsyncPostgresSaver setup
    mock_saver_instance = MagicMock()
    mock_saver_instance.setup = AsyncMock()
    mock_saver.return_value = mock_saver_instance
    
    # Mock AsyncConnectionPool context manager using AsyncMock to support async with
    mock_pool_instance = MagicMock()
    mock_pool_instance.__aenter__ = AsyncMock(return_value=MagicMock())
    mock_pool_instance.__aexit__ = AsyncMock()
    mock_pool.return_value = mock_pool_instance
    
    # Mock _setup_graph
    orchestrator._setup_graph = AsyncMock()
    
    # Call get_response
    with patch("app.services.agentic_orchestrator.ConfigService.get", AsyncMock(return_value="openai")):
        try:
            await orchestrator.get_response(
                business_id="biz_123",
                client_id="client_123",
                user_message="Hello",
                chat_id="chat_123"
            )
        except Exception:
            # Catch other downstream failures
            pass
            
    # Check that _setup_graph was called with active_store_id=None
    orchestrator._setup_graph.assert_called_once()
    args, kwargs = orchestrator._setup_graph.call_args
    assert args[3] is None

@pytest.mark.anyio
async def test_crm_clients_endpoint_filtering():
    # Test GET /clients filtering behavior
    mock_user = User(id="user_123", email="user@example.com")
    mock_business = BusinessProfile(id="biz_123", name="Test Business", user_id="user_123")
    
    # Setup mock clients in DB
    client_regular = Client(
        id="cli_1", 
        name="Client Regular", 
        role=None, 
        is_prospect=False,
        whatsapp_opt_in=False,
        business_id="biz_123",
        created_at=datetime.utcnow()
    )
    client_rep = Client(
        id="cli_2", 
        name="Sales Rep", 
        role="sales_rep", 
        is_prospect=False,
        whatsapp_opt_in=False,
        business_id="biz_123",
        created_at=datetime.utcnow()
    )
    
    mock_session = AsyncMock()
    mock_scalars_biz = MagicMock()
    mock_scalars_biz.first.return_value = mock_business
    mock_result_biz = MagicMock()
    mock_result_biz.scalars.return_value = mock_scalars_biz
    
    mock_scalars_cli = MagicMock()
    mock_scalars_cli.all.return_value = [client_regular]
    mock_result_cli = MagicMock()
    mock_result_cli.scalars.return_value = mock_scalars_cli
    
    def mock_db_execute(stmt):
        stmt_str = str(stmt).lower()
        if "from business_profiles" in stmt_str:
            return mock_result_biz
        elif "from clients" in stmt_str:
            # Check if role filter NOT IN is active in the SQL statement string
            if "not in" in stmt_str:
                mock_scalars_cli.all.return_value = [client_regular]
            else:
                mock_scalars_cli.all.return_value = [client_regular, client_rep]
            return mock_result_cli
        return MagicMock()
        
    mock_session.execute.side_effect = mock_db_execute
    
    # Override current user and DB dependencies
    from app.api.auth import get_current_user
    from app.core.database import get_db
    
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_session
    
    try:
        client = TestClient(app)
        
        # 1. By default, include_staff=False, should return only client_regular
        response = client.get("/api/v1/crm/clients")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "cli_1"
        
        # 2. With include_staff=true, should return both client_regular and client_rep
        response_all = client.get("/api/v1/crm/clients?include_staff=true")
        assert response_all.status_code == 200
        data_all = response_all.json()
        assert len(data_all) == 2
        
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
