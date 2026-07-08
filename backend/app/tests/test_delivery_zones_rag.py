import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.models.trade import Store
from app.services.graphrag import GraphRAGService

def test_store_semantic_summary_includes_delivery_zip_codes():
    # Store with delivery zip codes
    store = Store(
        name="Tienda Test",
        region="Centro",
        market="Tradicional",
        segment="A",
        delivery_zip_codes=["06700", "06600"]
    )
    summary = store.get_semantic_summary()
    assert "06700" in summary
    assert "06600" in summary
    assert "Zona de entrega a domicilio" in summary

    # Store without delivery zip codes (should not fail, should not include delivery text)
    store_empty = Store(
        name="Tienda Sin Cobertura",
        region="Norte",
        delivery_zip_codes=None
    )
    summary_empty = store_empty.get_semantic_summary()
    assert "Zona de entrega a domicilio" not in summary_empty

def test_store_knowledge_metadata_includes_delivery_zip_codes():
    store = Store(
        name="Tienda Test",
        delivery_zip_codes=["06700", "06600"]
    )
    metadata = store.get_knowledge_metadata()
    assert "delivery_zip_codes" in metadata
    assert metadata["delivery_zip_codes"] == ["06700", "06600"]

    store_empty = Store(
        name="Tienda Sin Cobertura",
        delivery_zip_codes=None
    )
    metadata_empty = store_empty.get_knowledge_metadata()
    assert "delivery_zip_codes" in metadata_empty
    assert metadata_empty["delivery_zip_codes"] == []

@pytest.mark.anyio
async def test_get_store_context_includes_delivery_zip_codes():
    mock_db = AsyncMock()
    
    # Mock Store with delivery zip codes
    mock_store = MagicMock(spec=Store)
    mock_store.id = "store_123"
    mock_store.name = "Tienda Mock"
    mock_store.market = "Traditional"
    mock_store.region = "North"
    mock_store.segment = "Gold"
    mock_store.clients = []
    mock_store.notes = []
    mock_store.delivery_zip_codes = ["06700", "06600"]
    
    # Mock Database Result
    mock_execute_res = MagicMock()
    mock_execute_res.scalars.return_value.first.return_value = mock_store
    
    # Mock Competitor query return
    mock_comp_res = MagicMock()
    mock_comp_res.scalars.return_value.all.return_value = []
    
    mock_db.execute.side_effect = [mock_execute_res, mock_comp_res]
    
    # Instantiate GraphRAGService with mock DB
    service = GraphRAGService(mock_db)
    
    context = await service.get_store_context("store_123")
    
    assert "delivery_zip_codes" in context
    assert context["delivery_zip_codes"] == ["06700", "06600"]
