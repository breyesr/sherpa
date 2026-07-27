import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.business import BusinessProfile
from app.models.crm import Client
from app.models.integration import Integration

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.fixture
def mock_db():
    """Mock database AsyncSession for SQLAlchemy queries."""
    db = MagicMock(spec=AsyncSession)
    
    # Pre-setup standard execute scalar/first chains
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = None
    mock_scalars.all.return_value = []
    
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    db.execute.return_value = mock_result
    
    return db

@pytest.fixture
def mock_business():
    """Fixture providing a mock BusinessProfile model."""
    business = MagicMock(spec=BusinessProfile)
    business.id = "business_123"
    business.name = "Test Business"
    business.timezone = "UTC"
    business.agents = []
    business.features_config = {}
    return business

@pytest.fixture
def mock_client():
    """Fixture providing a mock Client model."""
    client = MagicMock(spec=Client)
    client.id = "client_789"
    client.name = "Test Client"
    client.telegram_id = None
    client.whatsapp_id = None
    return client

@pytest.fixture
def mock_integration():
    """Fixture providing a mock Integration model."""
    integration = MagicMock(spec=Integration)
    integration.id = "integration_456"
    integration.provider = "whatsapp"
    integration.settings = {}
    return integration

@pytest.fixture
def mock_config_service():
    """Patches ConfigService to return default config values on get."""
    with patch("app.services.agentic_orchestrator.ConfigService") as mock_service:
        async def mock_config_get(db, key, default=None):
            return default
        mock_service.get.side_effect = mock_config_get
        yield mock_service
