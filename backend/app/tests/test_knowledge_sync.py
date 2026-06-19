import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import app.models
from app.tasks.knowledge import _sync_vector_logic, _write_to_dlq
from app.models.crm import Client
from app.models.trade import Store
from app.models.knowledge import KnowledgeCorpus
from app.models.dlq import VectorizationDLQ

@pytest.mark.anyio
@patch("app.tasks.knowledge.SessionLocal")
@patch("app.tasks.knowledge.EmbeddingService")
async def test_sync_vector_logic_hash_check(mock_embedding_service_cls, mock_session_local):
    # Setup mock DB session
    mock_db = AsyncMock()
    mock_session_local.return_value.__aenter__.return_value = mock_db
    
    # Mock client entity
    mock_client = MagicMock(spec=Client)
    mock_client.id = "client_1"
    mock_client.get_semantic_summary.return_value = "Client summary text"
    mock_client.get_knowledge_metadata.return_value = {"client_name": "John Doe"}
    
    # Mock database responses
    mock_scalars_res = MagicMock()
    mock_scalars_res.scalars.return_value.first.side_effect = [
        mock_client,  # For select(Client)
        None          # For select(KnowledgeCorpus) - initially no corpus entry
    ]
    mock_db.execute.return_value = mock_scalars_res
    
    # Mock embedding service
    mock_embedding_service = AsyncMock()
    mock_embedding_service.get_embedding.return_value = [0.1] * 1536
    mock_embedding_service_cls.return_value = mock_embedding_service
    
    # Run sync logic (First time: embedding generated)
    await _sync_vector_logic("client_1", "client", "business_1")
    
    assert mock_embedding_service.get_embedding.call_count == 1
    assert mock_db.add.call_count == 1
    assert mock_db.commit.call_count == 1
    
    # Now, test the skip when hash matches
    mock_embedding_service.reset_mock()
    mock_db.reset_mock()
    
    # Setup mock corpus entry with matching hash
    mock_corpus = MagicMock(spec=KnowledgeCorpus)
    import hashlib
    content_hash = hashlib.sha256("Client summary text".encode("utf-8")).hexdigest()
    mock_corpus.metadata_json = {"content_hash": content_hash}
    mock_corpus.embedding = [0.1] * 1536
    
    mock_scalars_res.scalars.return_value.first.side_effect = [
        mock_client,  # For select(Client)
        mock_corpus   # For select(KnowledgeCorpus) - entry exists
    ]
    
    # Run sync logic again (Second time: embedding skipped)
    await _sync_vector_logic("client_1", "client", "business_1")
    
    assert mock_embedding_service.get_embedding.call_count == 0  # SKIPPED!
    assert mock_db.commit.call_count == 1

@pytest.mark.anyio
@patch("app.tasks.knowledge.SessionLocal")
async def test_write_to_dlq(mock_session_local):
    mock_db = AsyncMock()
    mock_session_local.return_value.__aenter__.return_value = mock_db
    
    await _write_to_dlq("sync_vector_task", "client", "client_1", "business_1", "Some error", 5)
    
    assert mock_db.add.call_count == 1
    added_obj = mock_db.add.call_args[0][0]
    assert isinstance(added_obj, VectorizationDLQ)
    assert added_obj.entity_type == "client"
    assert added_obj.entity_id == "client_1"
    assert added_obj.business_id == "business_1"
    assert added_obj.error_message == "Some error"
    assert added_obj.retry_count == 5
    assert added_obj.status == "pending"
    assert mock_db.commit.call_count == 1
