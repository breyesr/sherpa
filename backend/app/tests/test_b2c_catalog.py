import pytest
from app.schemas.trade import ProductCreate, ProductUpdate
from app.models.trade import Product

def test_b2c_product_create_schema():
    # Test that ProductCreate successfully accepts basic B2C product fields (omitting wholesale_threshold and brand)
    product_data = {
        "name": "B2C Haircut Service Item",
        "price": 25.0,
        "description": "Standard B2C haircut service",
        "category_id": "cat_789"
    }
    
    schema = ProductCreate(**product_data)
    assert schema.name == "B2C Haircut Service Item"
    assert schema.price == 25.0
    assert schema.category_id == "cat_789"
    assert schema.wholesale_threshold is None
    assert schema.brand is None

def test_b2c_product_update_schema():
    # Test that ProductUpdate successfully accepts updates of price/name
    update_data = {
        "price": 30.0,
        "description": "Premium B2C haircut service"
    }
    
    schema = ProductUpdate(**update_data)
    assert schema.price == 30.0
    assert schema.description == "Premium B2C haircut service"
    assert schema.wholesale_threshold is None

def test_b2c_product_model():
    # Test that the Product database model accepts B2C rows
    product = Product(
        id="prod_haircut_123",
        category_id="cat_789",
        name="B2C Haircut",
        price=25.0,
        wholesale_threshold=None,
        brand=None
    )
    
    assert product.id == "prod_haircut_123"
    assert product.name == "B2C Haircut"
    assert product.price == 25.0
    assert product.wholesale_threshold is None
    assert product.brand is None
