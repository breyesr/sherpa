"""
Trade & Accounts Router package.
Split from monolithic trade.py into domain sub-routers.
"""
from fastapi import APIRouter

from app.api.trade.helpers import get_business, get_b2b_business
from app.api.trade.stores import router as stores_router
from app.api.trade.products import router as products_router
from app.api.trade.orders import router as orders_router
from app.api.trade.actions import router as actions_router

# Re-export all endpoint functions for test backward compatibility
from app.api.trade.stores import (
    list_stores, create_store, get_store, update_store, delete_store,
    create_store_note, list_postal_codes, list_states, list_municipalities,
    list_zip_codes, lookup_postal_code, list_competitors, create_competitor,
    get_strategic_brief, generate_visit_brief, qualify_lead,
)
from app.api.trade.products import (
    list_categories, create_category, list_products, create_product,
    get_product, update_product, delete_product,
)
from app.api.trade.orders import (
    list_prospect_orders, list_orders, create_order, get_order, update_order,
)
from app.api.trade.actions import (
    list_action_templates, create_action_template, update_action_template,
    delete_action_template, list_store_actions, get_store_action,
    create_store_action, update_store_action, delete_store_action,
    list_objectives, create_objective, delete_objective,
)

# Re-export Celery tasks so @patch("app.api.trade.sync_vector_task") keeps working
from app.tasks.knowledge import sync_vector_task, delete_vector_task

# Combined router
router = APIRouter()
router.include_router(stores_router)
router.include_router(products_router)
router.include_router(orders_router)
router.include_router(actions_router)
