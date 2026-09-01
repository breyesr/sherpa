import pytest
from app.schemas.trade import ProductCreate, ProductUpdate, ProductResponse
from app.models.trade import Product, Category
from app.models.business import BusinessProfile, Agent
from app.schemas.business import BusinessProfileBase, BusinessProfileUpdate, AgentBase, AgentUpdate

def test_product_custom_fields_schema():
    product_data = {
        "name": "Industrial Cement 50kg",
        "price": 180.0,
        "category_id": "cat_123",
        "custom_fields": {
            "material": "Portland Type II",
            "weight_kg": 50,
            "drying_time": "24 hours"
        }
    }
    create_schema = ProductCreate(**product_data)
    assert create_schema.custom_fields == {
        "material": "Portland Type II",
        "weight_kg": 50,
        "drying_time": "24 hours"
    }

    update_schema = ProductUpdate(custom_fields={"material": "Portland Type V"})
    assert update_schema.custom_fields == {"material": "Portland Type V"}

def test_product_model_semantic_summary_with_custom_fields():
    cat = Category(id="cat_123", name="Construcción", business_id="biz_123")
    prod = Product(
        id="prod_123",
        category_id="cat_123",
        name="Industrial Cement",
        brand="Sherpa Build",
        price=180.0,
        wholesale_threshold=100,
        custom_fields={
            "material": "Portland",
            "certifications": "ISO 9001"
        }
    )
    prod.category = cat

    summary = prod.get_semantic_summary()
    assert "Producto: Industrial Cement" in summary
    assert "material: Portland" in summary
    assert "certifications: ISO 9001" in summary
    assert "Umbral mayorista: 100" in summary

    metadata = prod.get_knowledge_metadata()
    assert metadata["custom_fields"] == {
        "material": "Portland",
        "certifications": "ISO 9001"
    }

def test_business_catalog_config_schema():
    biz_data = {
        "name": "Trade Corp",
        "catalog_config": [
            {"key": "material", "label": "Material Type", "type": "text"},
            {"key": "weight_kg", "label": "Weight in KG", "type": "number"}
        ]
    }
    biz_schema = BusinessProfileBase(**biz_data)
    assert len(biz_schema.catalog_config) == 2
    assert biz_schema.catalog_config[0]["key"] == "material"

    update_schema = BusinessProfileUpdate(catalog_config=[{"key": "origin", "label": "Origin Country", "type": "text"}])
    assert len(update_schema.catalog_config) == 1

def test_agent_allow_price_disclosure_schema():
    agent = AgentBase(
        name="Sales Assistant",
        tone="Professional",
        greeting="Hi",
        allow_price_disclosure=False
    )
    assert agent.allow_price_disclosure is False

    agent_default = AgentBase(
        name="Sales Assistant",
        tone="Professional",
        greeting="Hi"
    )
    assert agent_default.allow_price_disclosure is True

    agent_update = AgentUpdate(allow_price_disclosure=True)
    assert agent_update.allow_price_disclosure is True
