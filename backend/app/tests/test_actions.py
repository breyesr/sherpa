import pytest
from pydantic import ValidationError
from app.schemas.trade import StoreActionCreate, StoreActionUpdate, ActionStatus, ActionCategory

def test_action_status_enum():
    assert ActionStatus.PROPOSED == "proposed"
    assert ActionStatus.PENDING == "pending"
    assert ActionStatus.COMPLETED == "completed"
    assert ActionStatus.CANCELLED == "cancelled"

def test_pydantic_schema_action_create():
    # Test valid creation schema
    action_data = {
        "store_id": "store_123",
        "category": "COMMERCIAL",
        "objective": "THREAT_RESPONSE",
        "status": "proposed",
        "result_value": 15.50,
        "result_unit": "units",
        "revenue_impact": 150.00
    }
    action = StoreActionCreate(**action_data)
    assert action.store_id == "store_123"
    assert action.category == ActionCategory.COMMERCIAL
    assert action.objective == "THREAT_RESPONSE"
    assert action.status == ActionStatus.PROPOSED
    assert action.result_value == 15.50
    assert action.result_unit == "units"
    assert action.revenue_impact == 150.00

def test_pydantic_schema_action_invalid_category():
    # Invalid Enum category should fail validation
    with pytest.raises(ValidationError):
        StoreActionCreate(
            store_id="store_123",
            category="INVALID_CATEGORY",
            objective="THREAT_RESPONSE"
        )

def test_pydantic_schema_action_invalid_status():
    # Invalid Enum status should fail validation
    with pytest.raises(ValidationError):
        StoreActionCreate(
            store_id="store_123",
            category="COMMERCIAL",
            objective="THREAT_RESPONSE",
            status="done" # Should be "completed" or "pending" etc.
        )
