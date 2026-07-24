import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.ingestion import IngestionAgent
from app.api.trade import create_store_action, update_store_action, list_objectives, create_objective, delete_objective
from app.models.trade import Store, StoreActionObjective, StoreAction, ActionTemplate
from fastapi import HTTPException
from pydantic import BaseModel

@pytest.mark.anyio
@patch("app.services.ingestion.instructor.from_litellm")
@patch("app.services.ingestion.ConfigService")
async def test_dynamic_schema_compilation_with_db_values(mock_config_service, mock_from_litellm):
    # Mock ConfigService
    async def mock_config_get(db, key, default=None):
        return default
    mock_config_service.get.side_effect = mock_config_get

    # Mock instructor client
    mock_client = MagicMock()
    mock_completions = AsyncMock()
    
    # We want a fake response object
    mock_extraction_result = MagicMock()
    mock_extraction_result.store_name = "Store A"
    mock_extraction_result.general_note = "Great visit"
    mock_extraction_result.actions = []
    mock_extraction_result.competitors = []
    
    mock_completions.create.return_value = mock_extraction_result
    mock_client.chat.completions = mock_completions
    mock_from_litellm.return_value = mock_client

    # Mock DB execute returning custom objectives
    mock_db = AsyncMock()
    mock_execute_res = MagicMock()
    mock_execute_res.scalars.return_value.all.return_value = ["CUSTOM_OBJ_1", "CUSTOM_OBJ_2"]
    mock_db.execute.return_value = mock_execute_res

    agent = IngestionAgent(db=mock_db)
    result = await agent.extract_intelligence(business_id="biz_123", user_message="Visité Store A")

    # Assert completions create was called with response_model
    assert mock_completions.create.call_count == 1
    call_args = mock_completions.create.call_args[1]
    
    # response_model is the dynamically created ExtractionResult
    response_model = call_args["response_model"]
    assert issubclass(response_model, BaseModel)
    
    # Check that ActionInfo model contains our objective as a Literal with our custom objectives
    action_info_field = response_model.model_fields["actions"]
    # The actions list elements are of type DynamicActionInfo
    dynamic_action_info_model = action_info_field.annotation.__args__[0]
    objective_field = dynamic_action_info_model.model_fields["objective"]
    
    # The Literal values should be CUSTOM_OBJ_1 and CUSTOM_OBJ_2
    literal_vals = objective_field.annotation.__args__
    assert "CUSTOM_OBJ_1" in literal_vals
    assert "CUSTOM_OBJ_2" in literal_vals

@pytest.mark.anyio
@patch("app.api.trade_modules.actions.get_business")
async def test_create_store_action_with_valid_objective(mock_get_business):
    mock_db = AsyncMock()
    
    # Mock business
    mock_business = MagicMock()
    mock_business.id = "biz_123"
    mock_get_business.return_value = mock_business

    # Mock store exists
    mock_store = MagicMock(spec=Store)
    mock_store.id = "store_456"
    mock_store.name = "Store 456 Name"
    
    # Mock objective exists
    mock_objective = MagicMock(spec=StoreActionObjective)
    mock_objective.id = "obj_789"
    
    # Mock action reload
    mock_action = MagicMock(spec=StoreAction)
    mock_action.id = "action_xyz"
    mock_action.store = mock_store
    mock_action.assigned_to = None
    mock_action.template = None
    
    mock_execute_res = MagicMock()
    mock_execute_res.scalars.return_value.first.side_effect = [
        mock_store,      # For Store query
        mock_objective,  # For StoreActionObjective query
        mock_action      # For StoreAction reload query
    ]
    mock_db.execute.return_value = mock_execute_res

    mock_current_user = MagicMock()
    mock_current_user.id = "user_abc"

    from app.schemas.trade import StoreActionCreate
    action_in = StoreActionCreate(
        store_id="store_456",
        category="COMMERCIAL",
        objective="CUSTOM_OBJ_1",
        status="proposed"
    )

    # Calling endpoint
    res = await create_store_action(
        action_in=action_in,
        db=mock_db,
        current_user=mock_current_user
    )

    assert mock_db.add.call_count == 1
    assert mock_db.commit.call_count == 1
    assert res.store_name == "Store 456 Name"

@pytest.mark.anyio
@patch("app.api.trade_modules.actions.get_business")
async def test_create_store_action_with_invalid_objective_fails(mock_get_business):
    mock_db = AsyncMock()
    
    mock_business = MagicMock()
    mock_business.id = "biz_123"
    mock_get_business.return_value = mock_business

    mock_store = MagicMock(spec=Store)
    mock_store.id = "store_456"
    
    mock_execute_res = MagicMock()
    # Objective query returns None (not found)
    mock_execute_res.scalars.return_value.first.side_effect = [
        mock_store,
        None
    ]
    mock_db.execute.return_value = mock_execute_res

    mock_current_user = MagicMock()
    mock_current_user.id = "user_abc"

    from app.schemas.trade import StoreActionCreate
    action_in = StoreActionCreate(
        store_id="store_456",
        category="COMMERCIAL",
        objective="INVALID_OBJ",
        status="proposed"
    )

    with pytest.raises(HTTPException) as exc_info:
        await create_store_action(
            action_in=action_in,
            db=mock_db,
            current_user=mock_current_user
        )
    assert exc_info.value.status_code == 400
    assert "Invalid objective" in exc_info.value.detail

@pytest.mark.anyio
@patch("app.api.trade_modules.actions.get_business")
async def test_list_and_manage_objectives(mock_get_business):
    mock_db = AsyncMock()
    
    mock_business = MagicMock()
    mock_business.id = "biz_123"
    mock_get_business.return_value = mock_business

    # 1. Test Listing
    mock_obj1 = MagicMock(spec=StoreActionObjective)
    mock_obj2 = MagicMock(spec=StoreActionObjective)
    
    mock_execute_res = MagicMock()
    mock_execute_res.scalars.return_value.all.return_value = [mock_obj1, mock_obj2]
    mock_db.execute.return_value = mock_execute_res

    mock_current_user = MagicMock()
    
    objectives = await list_objectives(db=mock_db, current_user=mock_current_user)
    assert len(objectives) == 2

    # 2. Test Creating
    from app.schemas.trade import StoreActionObjectiveCreate
    obj_in = StoreActionObjectiveCreate(
        name="NEW_STRATEGY",
        label="New Strategy Label",
        category="COMMERCIAL"
    )
    
    # Mock check: exists query returns None
    mock_execute_res.scalars.return_value.first.return_value = None
    
    res = await create_objective(obj_in=obj_in, db=mock_db, current_user=mock_current_user)
    assert mock_db.add.call_count == 1
    assert mock_db.commit.call_count == 1


@pytest.mark.anyio
@patch("app.api.trade_modules.actions.get_business")
async def test_create_store_action_validation_gates(mock_get_business):
    mock_db = AsyncMock()
    
    mock_business = MagicMock()
    mock_business.id = "biz_123"
    mock_get_business.return_value = mock_business

    mock_store = MagicMock(spec=Store)
    mock_store.id = "store_456"

    # Mock objective matches (so first call returns store, second returns objective)
    mock_objective = MagicMock(spec=StoreActionObjective)
    mock_objective.id = "obj_789"
    mock_objective.category = "MARKETING"
    
    mock_execute_res = MagicMock()
    
    # 1. Test case: category mismatch (Action: COMMERCIAL, Objective: MARKETING)
    mock_execute_res.scalars.return_value.first.side_effect = [
        mock_store,
        None  # No match in objectives query because of category mismatch filter in SQL
    ]
    mock_db.execute.return_value = mock_execute_res

    from app.schemas.trade import StoreActionCreate
    action_in = StoreActionCreate(
        store_id="store_456",
        category="COMMERCIAL",
        objective="SHARE_OF_SHELF",
        status="proposed"
    )

    with pytest.raises(HTTPException) as exc_info:
        await create_store_action(
            action_in=action_in,
            db=mock_db,
            current_user=MagicMock()
        )
    assert exc_info.value.status_code == 400
    assert "Invalid objective" in exc_info.value.detail

    # 2. Test case: SHARE_OF_SHELF with target_value > 100 (fails)
    mock_execute_res.scalars.return_value.first.side_effect = [
        mock_store,
        mock_objective
    ]
    action_in_invalid_goal = StoreActionCreate(
        store_id="store_456",
        category="MARKETING",
        objective="SHARE_OF_SHELF",
        status="proposed",
        details={"target_value": 150.0}
    )

    with pytest.raises(HTTPException) as exc_info:
        await create_store_action(
            action_in=action_in_invalid_goal,
            db=mock_db,
            current_user=MagicMock()
        )
    assert exc_info.value.status_code == 400
    assert "Goal percentage must be between 1 and 100" in exc_info.value.detail


@pytest.mark.anyio
@patch("app.api.trade_modules.actions.get_business")
async def test_create_store_action_from_template_resolution(mock_get_business):
    mock_db = AsyncMock()
    
    mock_business = MagicMock()
    mock_business.id = "biz_123"
    mock_get_business.return_value = mock_business

    mock_store = MagicMock(spec=Store)
    mock_store.id = "store_456"
    mock_store.name = "Store Name ABC"

    # Mock template
    mock_template = MagicMock(spec=ActionTemplate)
    mock_template.id = "tpl_789"
    mock_template.name = "Template Title"
    mock_template.description = "Template Instructions"
    mock_template.category = "COMMERCIAL"
    mock_template.objective = "TRADE_LOYALTY_VOLUME_PUSHING"
    mock_template.default_unit = "pesos"

    # Mock objective
    mock_objective = MagicMock(spec=StoreActionObjective)
    mock_objective.id = "obj_abc"

    # Mock action created/reloaded
    mock_action = MagicMock(spec=StoreAction)
    mock_action.id = "action_xyz"
    mock_action.store = mock_store
    mock_action.assigned_to = None
    mock_action.template = mock_template
    
    mock_execute_res = MagicMock()
    mock_execute_res.scalars.return_value.first.side_effect = [
        mock_store,     # For store check
        mock_template,  # For template lookup
        mock_objective, # For objective validation
        mock_action     # For action reload
    ]
    mock_db.execute.return_value = mock_execute_res

    from app.schemas.trade import StoreActionCreate
    action_in = StoreActionCreate(
        store_id="store_456",
        template_id="tpl_789",
        category="COMMERCIAL",  # Will be overridden
        objective="GENERAL",    # Will be overridden
        details={"target_value": 5000.0}
    )

    res = await create_store_action(
        action_in=action_in,
        db=mock_db,
        current_user=MagicMock()
    )

    # Check database add parameter values
    added_action_dict = mock_db.add.call_args[0][0].__dict__
    assert added_action_dict["category"] == "COMMERCIAL"
    assert added_action_dict["objective"] == "TRADE_LOYALTY_VOLUME_PUSHING"
    assert added_action_dict["result_unit"] == "pesos"
    assert added_action_dict["details"]["title"] == "Template Title"
    assert added_action_dict["details"]["description"] == "Template Instructions"
    assert added_action_dict["details"]["target_value"] == 5000.0


