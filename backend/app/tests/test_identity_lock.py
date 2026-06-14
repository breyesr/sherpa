import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from app.services.graphrag import GraphRAGService
from app.services.orchestrator import B2BOrchestrator

@pytest.mark.asyncio
async def test_identity_lock_logic():
    """Test that GraphRAGService respects and enforces discovery_scope."""
    mock_db = MagicMock()
    service = GraphRAGService(mock_db)
    
    # Mocking dependencies
    service.embeddings = MagicMock()
    service.embeddings.get_embedding = AsyncMock(return_value=[0.1] * 1536)
    
    # Mock DB response for stores
    mock_store = MagicMock()
    mock_store.id = "store_123"
    mock_store.name = "Store Alpha"
    mock_store.business_id = "biz_456"
    mock_store.region = "North"
    mock_store.market = "General"
    
    # Mocking db.execute
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [mock_store]
    mock_result.scalars().first.return_value = mock_store
    mock_db.execute = AsyncMock(return_value=mock_result)

    # Mock ChatMemory to simulate an active session
    with patch("app.core.memory.ChatMemory") as mock_memory_class:
        mock_memory_instance = mock_memory_class.return_value
        mock_memory_instance.get_metadata = AsyncMock(return_value={"active_store_id": "store_123"})

        # Test generate_brief enforces LOCAL scope when locked
        with patch("litellm.acompletion", new_callable=AsyncMock) as mock_complete:

            mock_complete.return_value.choices[0].message.content = "Mocked Response"
            
            # We also need to mock get_store_context and find_similar_notes to avoid deep logic
            service.get_store_context = AsyncMock(return_value={"name": "Store Alpha"})
            service.find_similar_notes = AsyncMock(return_value=[])
            
            # Mock ConfigService
            with patch("app.core.system_config.ConfigService.get", new_callable=AsyncMock) as mock_config:
                mock_config.return_value = "mock_val"
                
                await service.generate_brief("Tell me about this store", "biz_456", chat_id="chat_789")
                
                # Verify find_similar_notes was called with discovery_scope="LOCAL"
                service.find_similar_notes.assert_called_with(
                    "Tell me about this store", "biz_456", store_id="store_123", discovery_scope="LOCAL"
                )

@pytest.mark.asyncio
async def test_global_discovery_switch():
    """Test that explicit GLOBAL scope is respected."""
    mock_db = MagicMock()
    service = GraphRAGService(mock_db)
    
    # Mocking dependencies
    service.embeddings = MagicMock()
    service.embeddings.get_embedding = AsyncMock(return_value=[0.1] * 1536)

    mock_store = MagicMock()
    mock_store.id = "store_123"
    mock_store.name = "Store Alpha"
    mock_store.region = "North"
    mock_store.market = "General"

    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [mock_store]
    mock_result.scalars().first.return_value = mock_store
    mock_db.execute = AsyncMock(return_value=mock_result)

    with patch("app.core.memory.ChatMemory") as mock_memory_class:
        mock_memory_instance = mock_memory_class.return_value
        mock_memory_instance.get_metadata = AsyncMock(return_value={"active_store_id": "store_123"})

        with patch("litellm.acompletion", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value.choices[0].message.content = "Mocked Global Response"
            service.search_store_profiles = AsyncMock(return_value=[{"name": "Store Beta"}])
            service.generate_discovery_response = AsyncMock(return_value="Discovery Response")

            # Mock ConfigService
            with patch("app.core.system_config.ConfigService.get", new_callable=AsyncMock) as mock_config:
                mock_config.return_value = "mock_val"

                # Call with explicit GLOBAL scope
                await service.generate_brief("Search all stores", "biz_456", chat_id="chat_789", discovery_scope="GLOBAL")

                # Verify search_store_profiles was called (indicates global mode)
                service.search_store_profiles.assert_called()


if __name__ == "__main__":
    asyncio.run(test_identity_lock_logic())
    asyncio.run(test_global_discovery_switch())
    print("Tests passed!")
