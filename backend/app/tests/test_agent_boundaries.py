import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.trade_tools import TradeToolKit
from app.models.trade import Order, OrderItem, Product, Store
from app.models.crm import Client
from datetime import datetime, date

@pytest.mark.asyncio
async def test_get_tool_definitions_recent_orders():
    defs = TradeToolKit.get_tool_definitions()
    names = [d["function"]["name"] for d in defs]
    assert "get_recent_orders" in names
    
    # Check schema parameters
    recent_orders_def = next(d for d in defs if d["function"]["name"] == "get_recent_orders")
    params = recent_orders_def["function"]["parameters"]["properties"]
    assert "store_id" in params
    assert "limit" in params

@pytest.mark.asyncio
async def test_get_recent_orders_query():
    # Setup mock DB session
    mock_db = AsyncMock()
    
    # Setup mock objects
    store = Store(id="store_abc", name="La Tienda de Prueba")
    client = Client(id="client_xyz", name="Don Ramon")
    product = Product(id="prod_123", name="Refresco", sku="SKU-REF")
    
    order_item = OrderItem(
        product_id="prod_123",
        quantity=3,
        unit_price=12.5,
        product=product
    )
    
    order = Order(
        id="order_1",
        business_id="bus_1",
        store_id="store_abc",
        client_id="client_xyz",
        status="completed",
        total_amount=37.5,
        notes="Prueba de orden",
        created_at=datetime(2026, 6, 19, 12, 0, 0),
        delivery_date=date(2026, 6, 20),
        store=store,
        client=client,
        items=[order_item]
    )
    
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [order]
    mock_db.execute.return_value = mock_result
    
    toolkit = TradeToolKit(mock_db)
    
    # Test call
    res = await toolkit.get_recent_orders(business_id="bus_1", store_id="store_abc", limit=5)
    
    # Asserts
    assert len(res) == 1
    o_data = res[0]
    assert o_data["order_id"] == "order_1"
    assert o_data["store_name"] == "La Tienda de Prueba"
    assert o_data["client_name"] == "Don Ramon"
    assert o_data["status"] == "completed"
    assert o_data["total_amount"] == 37.5
    assert len(o_data["items"]) == 1
    assert o_data["items"][0]["product_name"] == "Refresco"
    assert o_data["items"][0]["sku"] == "SKU-REF"
    assert o_data["items"][0]["quantity"] == 3
    assert o_data["items"][0]["unit_price"] == 12.5
    
    # Check query execution
    mock_db.execute.assert_called_once()
    stmt = mock_db.execute.call_args[0][0]
    assert "orders" in str(stmt).lower()
