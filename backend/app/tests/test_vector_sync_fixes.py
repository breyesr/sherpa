import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.api.trade import delete_store, create_competitor
from app.api.crm import delete_client
from app.models.trade import Store, StoreNote, Competitor
from app.models.crm import Client
from fastapi import HTTPException

@pytest.mark.anyio
@patch("app.api.trade.delete_vector_task")
@patch("app.api.trade.get_business")
async def test_delete_store_vector_cascades_mock(mock_get_business, mock_delete_task):
    mock_db = AsyncMock()
    
    # Mock business
    mock_business = MagicMock()
    mock_business.id = "business_123"
    mock_get_business.return_value = mock_business
    
    # Mock store
    mock_store = MagicMock(spec=Store)
    mock_store.id = "store_456"
    mock_store.business_id = "business_123"
    
    # Database responses
    mock_execute_res = MagicMock()
    mock_execute_res.scalars.return_value.first.return_value = mock_store
    
    mock_execute_res.scalars.return_value.all.side_effect = [
        [],             # For Order.id query
        ["note_abc"],   # For StoreNote.id query
        ["comp_xyz"],   # For Competitor.id query
        []              # For Client query
    ]
    mock_db.execute.return_value = mock_execute_res
    
    # Run delete_store
    mock_current_user = MagicMock()
    mock_current_user.id = "user_789"
    
    res = await delete_store(
        store_id="store_456",
        db=mock_db,
        current_user=mock_current_user
    )
    
    assert res == {"status": "deleted"}
    assert mock_db.delete.call_count == 1
    assert mock_db.commit.call_count == 1
    
    # Assert delete_vector_task.delay was called for store, note, and competitor
    assert mock_delete_task.delay.call_count == 3
    mock_delete_task.delay.assert_any_call("store_456", "store", "business_123")
    mock_delete_task.delay.assert_any_call("note_abc", "store_note", "business_123")
    mock_delete_task.delay.assert_any_call("comp_xyz", "competitor", "business_123")

@pytest.mark.anyio
@patch("app.api.crm.delete_vector_task")
@patch("app.api.crm.get_user_business")
async def test_delete_client_vector_cascades_mock(mock_get_user_business, mock_delete_task):
    mock_db = AsyncMock()
    
    # Mock business
    mock_business = MagicMock()
    mock_business.id = "business_123"
    mock_get_user_business.return_value = mock_business
    
    # Mock client
    mock_client = MagicMock(spec=Client)
    mock_client.id = "client_789"
    mock_client.business_id = "business_123"
    
    # Database responses
    mock_execute_res = MagicMock()
    mock_execute_res.scalars.return_value.first.return_value = mock_client
    mock_execute_res.scalars.return_value.all.return_value = ["cust_note_999"]
    mock_db.execute.return_value = mock_execute_res
    
    mock_current_user = MagicMock()
    mock_current_user.id = "user_789"
    
    res = await delete_client(
        client_id="client_789",
        db=mock_db,
        current_user=mock_current_user
    )
    
    assert res == {"status": "deleted"}
    assert mock_db.delete.call_count == 1
    assert mock_db.commit.call_count == 1
    
    # Assert delete_vector_task.delay was called for client and customer note
    assert mock_delete_task.delay.call_count == 2
    mock_delete_task.delay.assert_any_call("client_789", "client", "business_123")
    mock_delete_task.delay.assert_any_call("cust_note_999", "customer_note", "business_123")

@pytest.mark.anyio
@patch("app.api.trade.sync_vector_task")
@patch("app.api.trade.get_business")
async def test_create_competitor_vector_hook_mock(mock_get_business, mock_sync_task):
    mock_db = AsyncMock()
    
    # Mock business
    mock_business = MagicMock()
    mock_business.id = "business_123"
    mock_get_business.return_value = mock_business
    
    # Mock store lookup success
    mock_store = MagicMock(spec=Store)
    mock_store.id = "store_456"
    
    mock_execute_res = MagicMock()
    mock_execute_res.scalars.return_value.first.return_value = mock_store
    mock_db.execute.return_value = mock_execute_res
    
    # Mock competitor input
    mock_comp_in = MagicMock()
    mock_comp_in.store_id = "store_456"
    mock_comp_in.model_dump.return_value = {
        "store_id": "store_456",
        "name": "Test Brand",
        "presence_level": "medium",
        "notes": "Spotted rival promotions"
    }
    
    # Capture competitor model instantiation or commit
    async def mock_commit():
        if mock_db.add.call_args:
            obj = mock_db.add.call_args[0][0]
            obj.id = "comp_uuid_777"
            
    mock_db.commit.side_effect = mock_commit
    
    async def mock_refresh(obj):
        obj.id = "comp_uuid_777"
        
    mock_db.refresh.side_effect = mock_refresh
    
    mock_current_user = MagicMock()
    mock_current_user.id = "user_789"
    
    res = await create_competitor(
        competitor_in=mock_comp_in,
        db=mock_db,
        current_user=mock_current_user
    )
    
    assert res.id == "comp_uuid_777"
    assert mock_db.commit.call_count == 1
    
    # Assert sync_vector_task was triggered
    mock_sync_task.delay.assert_called_once_with("comp_uuid_777", "competitor", "business_123")
