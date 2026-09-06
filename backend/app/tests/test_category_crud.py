import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.models.trade import Category, Product, Order
from app.models.user import User
from app.models.business import BusinessProfile
from app.schemas.trade import (
    CategoryCreate, CategoryUpdate, CategoryResponse
)
from app.api.trade.products import (
    list_categories, get_category, create_category, update_category, delete_category, delete_product
)
from app.api.trade.orders import delete_order

def test_category_schemas():
    # Test Create
    cat_create = CategoryCreate(
        name="Bebidas",
        category_type="Beverages",
        description="Refrescos y jugos",
        fields_config=[
            {"key": "volume_ml", "label": "Volumen (ml)", "type": "number"},
            {"key": "sugar_free", "label": "Sin Azúcar", "type": "boolean"}
        ]
    )
    assert cat_create.name == "Bebidas"
    assert len(cat_create.fields_config) == 2
    assert cat_create.fields_config[0]["key"] == "volume_ml"

    # Test Update
    cat_update = CategoryUpdate(
        name="Bebidas y Jugos",
        fields_config=[
            {"key": "volume_ml", "label": "Volumen (ml)", "type": "number"}
        ]
    )
    assert cat_update.name == "Bebidas y Jugos"
    assert len(cat_update.fields_config) == 1

    # Test Response
    cat_resp = CategoryResponse(
        id="cat_123",
        business_id="biz_123",
        name="Bebidas",
        category_type="Beverages",
        fields_config=[{"key": "volume_ml", "label": "Volumen (ml)", "type": "number"}],
        product_count=5,
        created_at="2026-09-05T20:00:00",
        updated_at="2026-09-05T20:00:00"
    )
    assert cat_resp.product_count == 5
    assert len(cat_resp.fields_config) == 1

def test_category_model_semantic_summary_and_metadata():
    cat = Category(
        id="cat_bev",
        business_id="biz_123",
        name="Bebidas Frías",
        category_type="Beverages",
        description="Refrescos embotellados",
        fields_config=[
            {"key": "volume_ml", "label": "Volumen", "type": "number"},
            {"key": "alcohol_pct", "label": "Porcentaje de Alcohol", "type": "number"}
        ]
    )
    summary = cat.get_semantic_summary()
    assert "Categoría: Bebidas Frías" in summary
    assert "Tipo: Beverages" in summary
    assert "Especificaciones disponibles: Volumen, Porcentaje de Alcohol" in summary

    metadata = cat.get_knowledge_metadata()
    assert metadata["name"] == "Bebidas Frías"
    assert len(metadata["fields_config"]) == 2

@pytest.mark.anyio
@patch("app.api.trade.get_business")
async def test_list_categories_endpoint(mock_get_biz):
    mock_biz = MagicMock()
    mock_biz.id = "biz_123"
    mock_get_biz.return_value = mock_biz

    cat = Category(
        id="cat_1",
        business_id="biz_123",
        name="Snacks",
        category_type="Food",
        fields_config=[{"key": "weight_g", "label": "Peso (g)", "type": "number"}]
    )

    mock_db = AsyncMock()
    mock_result = MagicMock()
    # Mock row tuple (cat, p_count)
    mock_result.all.return_value = [(cat, 4)]
    mock_db.execute.return_value = mock_result

    user = User(id="user_123", email="rep@sherpa.com")
    res = await list_categories(db=mock_db, current_user=user)

    assert len(res) == 1
    assert res[0].name == "Snacks"
    assert res[0].product_count == 4
    assert res[0].fields_config[0]["key"] == "weight_g"

@pytest.mark.anyio
@patch("app.api.trade.get_business")
async def test_get_category_endpoint(mock_get_biz):
    mock_biz = MagicMock()
    mock_biz.id = "biz_123"
    mock_get_biz.return_value = mock_biz

    cat = Category(
        id="cat_1",
        business_id="biz_123",
        name="Limpieza",
        fields_config=[]
    )

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.first.return_value = (cat, 2)
    mock_db.execute.return_value = mock_result

    user = User(id="user_123", email="rep@sherpa.com")
    res = await get_category(category_id="cat_1", db=mock_db, current_user=user)

    assert res.id == "cat_1"
    assert res.name == "Limpieza"
    assert res.product_count == 2

    # Test 404
    mock_result.first.return_value = None
    with pytest.raises(HTTPException) as exc:
        await get_category(category_id="cat_missing", db=mock_db, current_user=user)
    assert exc.value.status_code == 404

@pytest.mark.anyio
@patch("app.api.trade.get_business")
async def test_create_category_endpoint(mock_get_biz):
    mock_biz = MagicMock()
    mock_biz.id = "biz_123"
    mock_get_biz.return_value = mock_biz

    mock_db = AsyncMock()
    user = User(id="user_123", email="rep@sherpa.com")

    cat_in = CategoryCreate(
        name="Lácteos",
        category_type="Dairy",
        fields_config=[{"key": "fat_pct", "label": "% Grasa", "type": "number"}]
    )

    res = await create_category(category_in=cat_in, db=mock_db, current_user=user)
    assert res.name == "Lácteos"
    assert res.category_type == "Dairy"
    assert res.product_count == 0
    assert len(res.fields_config) == 1
    assert mock_db.add.called
    assert mock_db.commit.called

@pytest.mark.anyio
@patch("app.api.trade.get_business")
async def test_update_category_endpoint(mock_get_biz):
    mock_biz = MagicMock()
    mock_biz.id = "biz_123"
    mock_get_biz.return_value = mock_biz

    cat = Category(
        id="cat_1",
        business_id="biz_123",
        name="Lácteos",
        fields_config=[]
    )

    mock_db = AsyncMock()
    mock_res_cat = MagicMock()
    mock_res_cat.scalar_one_or_none.return_value = cat

    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 3

    mock_db.execute.side_effect = [mock_res_cat, mock_res_count]

    user = User(id="user_123", email="rep@sherpa.com")
    update_in = CategoryUpdate(
        name="Lácteos y Derivados",
        fields_config=[{"key": "origin", "label": "Origen", "type": "text"}]
    )

    res = await update_category(category_id="cat_1", category_in=update_in, db=mock_db, current_user=user)
    assert res.name == "Lácteos y Derivados"
    assert res.product_count == 3
    assert len(res.fields_config) == 1
    assert mock_db.commit.called

@pytest.mark.anyio
@patch("app.api.trade.get_business")
async def test_delete_category_integrity_safeguard(mock_get_biz):
    mock_biz = MagicMock()
    mock_biz.id = "biz_123"
    mock_get_biz.return_value = mock_biz

    cat = Category(id="cat_1", business_id="biz_123", name="Bebidas")

    mock_db = AsyncMock()
    user = User(id="user_123", email="rep@sherpa.com")

    # Case 1: Category contains products (product_count = 5) -> Must raise HTTP 400
    mock_res_cat = MagicMock()
    mock_res_cat.scalar_one_or_none.return_value = cat

    mock_res_count_has_products = MagicMock()
    mock_res_count_has_products.scalar.return_value = 5

    mock_db.execute.side_effect = [mock_res_cat, mock_res_count_has_products]

    with pytest.raises(HTTPException) as exc:
        await delete_category(category_id="cat_1", db=mock_db, current_user=user)
    assert exc.value.status_code == 400
    assert "Cannot delete category 'Bebidas'" in exc.value.detail
    assert "contains 5 product(s)" in exc.value.detail
    assert not mock_db.delete.called

    # Case 2: Category is empty (product_count = 0) -> Delete proceeds
    mock_res_count_empty = MagicMock()
    mock_res_count_empty.scalar.return_value = 0
    mock_db.execute.side_effect = [mock_res_cat, mock_res_count_empty]

    del_res = await delete_category(category_id="cat_1", db=mock_db, current_user=user)
    assert del_res["status"] == "success"
    assert mock_db.delete.called
    assert mock_db.commit.called

@pytest.mark.asyncio
@patch("app.api.trade.get_business")
async def test_delete_product_order_history_protection(mock_get_biz):
    mock_biz = BusinessProfile(id="biz_123", name="Acme")
    mock_get_biz.return_value = mock_biz

    prod = Product(id="prod_1", category_id="cat_1", name="PVC Pipe")
    mock_db = AsyncMock()
    user = User(id="user_123", email="rep@sherpa.com")

    # Case 1: Product is referenced in order items -> Must raise HTTP 400
    mock_res_prod = MagicMock()
    mock_res_prod.scalars().first.return_value = prod

    mock_res_order_count = MagicMock()
    mock_res_order_count.scalar.return_value = 2

    mock_db.execute.side_effect = [mock_res_prod, mock_res_order_count]

    with pytest.raises(HTTPException) as exc:
        await delete_product(product_id="prod_1", db=mock_db, current_user=user)
    assert exc.value.status_code == 400
    assert "Cannot delete product 'PVC Pipe'" in exc.value.detail
    assert "referenced in 2 order record(s)" in exc.value.detail

    # Case 2: Product has no order items -> Delete proceeds
    mock_res_order_empty = MagicMock()
    mock_res_order_empty.scalar.return_value = 0
    mock_db.execute.side_effect = [mock_res_prod, mock_res_order_empty]

    res = await delete_product(product_id="prod_1", db=mock_db, current_user=user)
    assert res["status"] == "success"
    assert mock_db.delete.called

@pytest.mark.asyncio
@patch("app.api.trade.get_business")
async def test_delete_order_endpoint(mock_get_biz):
    mock_biz = BusinessProfile(id="biz_123", name="Acme")
    mock_get_biz.return_value = mock_biz

    order = Order(id="order_1", business_id="biz_123", store_id="store_1")
    mock_db = AsyncMock()
    user = User(id="user_123", email="rep@sherpa.com")

    # Case 1: Order exists and belongs to business -> deleted successfully
    mock_res_order = MagicMock()
    mock_res_order.scalars().first.return_value = order
    mock_db.execute.return_value = mock_res_order

    res = await delete_order(order_id="order_1", db=mock_db, current_user=user)
    assert res["status"] == "success"
    assert "deleted successfully" in res["message"]
    assert mock_db.delete.called
    assert mock_db.commit.called

    # Case 2: Order does not exist or belongs to another business -> HTTP 404
    mock_res_not_found = MagicMock()
    mock_res_not_found.scalars().first.return_value = None
    mock_db.execute.return_value = mock_res_not_found

    with pytest.raises(HTTPException) as exc:
        await delete_order(order_id="order_other", db=mock_db, current_user=user)
    assert exc.value.status_code == 404


