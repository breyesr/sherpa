"""
Re-export hub for Trade domain models to preserve backward compatibility.
All model imports from app.models.trade continue working uninterrupted.
"""

from app.models.trade_modules.store import (
    StoreNoteType,
    store_clients,
    DataSourceType,
    PostalCode,
    Store,
    StoreNote,
    AccountIntelligence
)
from app.models.trade_modules.product import (
    Category,
    Product
)
from app.models.trade_modules.order import (
    OrderStatus,
    Order,
    OrderItem
)
from app.models.trade_modules.action import (
    ActionCategory,
    ActionStatus,
    StoreActionCategory,
    StoreActionStatus,
    StoreAction,
    ActionTemplate,
    StoreActionObjective,
    Competitor,
    CustomerNote
)

__all__ = [
    "StoreNoteType",
    "store_clients",
    "DataSourceType",
    "OrderStatus",
    "Category",
    "Product",
    "PostalCode",
    "Store",
    "StoreNote",
    "AccountIntelligence",
    "Order",
    "OrderItem",
    "ActionCategory",
    "ActionStatus",
    "StoreActionCategory",
    "StoreActionStatus",
    "StoreAction",
    "ActionTemplate",
    "StoreActionObjective",
    "Competitor",
    "CustomerNote"
]
