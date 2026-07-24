"""
Aggregator Trade API Router module.
Combines sub-routers for stores, products, orders, and actions.
Re-exports all endpoints and helpers for 100% backward compatibility.
"""
from fastapi import APIRouter
from app.api.trade_modules.stores import (
    router as stores_router,
    get_business,
    list_stores,
    create_store,
    get_store,
    update_store,
    delete_store,
    list_store_notes,
    create_store_note,
    lookup_postal_code
)
from app.api.trade_modules.products import (
    router as products_router,
    list_categories,
    create_category,
    list_products,
    create_product,
    get_product,
    update_product,
    delete_product
)
from app.api.trade_modules.orders import (
    router as orders_router,
    list_orders,
    create_order,
    get_order,
    update_order
)
from app.api.trade_modules.actions import (
    router as actions_router,
    list_objectives,
    create_objective,
    delete_objective,
    list_store_action_objectives,
    create_store_action_objective,
    list_action_templates,
    create_action_template,
    list_store_actions,
    create_store_action,
    update_store_action,
    delete_store_action,
    list_competitors,
    create_competitor
)

router = APIRouter()

router.include_router(stores_router)
router.include_router(products_router)
router.include_router(orders_router)
router.include_router(actions_router)
