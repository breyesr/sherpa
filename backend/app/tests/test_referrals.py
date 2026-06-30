import pytest
from datetime import datetime
from pydantic import ValidationError
from app.schemas.trade import StoreCreate, StoreUpdate
from app.models.trade import Store

def test_store_referral_schema_valid():
    # Test that StoreCreate schema successfully parses new referral fields
    store_data = {
        "name": "Obra Prospecto",
        "is_prospect": True,
        "assigned_store_id": "store_distributor_123",
        "requested_product_id": "product_456",
        "requested_quantity": 100,
        "potential_value": 4500.0,
        "referred_at": datetime.utcnow().isoformat()
    }
    
    schema = StoreCreate(**store_data)
    assert schema.name == "Obra Prospecto"
    assert schema.is_prospect is True
    assert schema.assigned_store_id == "store_distributor_123"
    assert schema.requested_product_id == "product_456"
    assert schema.requested_quantity == 100
    assert schema.potential_value == 4500.0
    assert schema.referred_at is not None

def test_store_referral_update_schema():
    # Test that StoreUpdate schema successfully parses new referral fields
    update_data = {
        "assigned_store_id": "store_distributor_123",
        "potential_value": 5000.0
    }
    
    schema = StoreUpdate(**update_data)
    assert schema.assigned_store_id == "store_distributor_123"
    assert schema.potential_value == 5000.0

def test_store_model_attributes():
    # Test that Store model successfully accepts the new attributes
    referred_time = datetime.utcnow()
    store = Store(
        id="prospect_store_789",
        business_id="biz_999",
        name="Obra Prospecto",
        is_prospect=True,
        assigned_store_id="distributor_store_123",
        requested_product_id="product_abc",
        requested_quantity=50,
        potential_value=1250.0,
        referred_at=referred_time
    )
    
    assert store.id == "prospect_store_789"
    assert store.is_prospect is True
    assert store.assigned_store_id == "distributor_store_123"
    assert store.requested_product_id == "product_abc"
    assert store.requested_quantity == 50
    assert store.potential_value == 1250.0
    assert store.referred_at == referred_time
