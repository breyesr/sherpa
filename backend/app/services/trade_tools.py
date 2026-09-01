import json
from typing import Dict, Any, Optional, List
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.trade import AccountIntelligence, Store, Order, OrderItem
from app.tasks.ingestion import process_b2b_ingestion

class TradeToolKit:
    def __init__(self, db: Any):
        self.db = db

    @staticmethod
    def get_tool_definitions() -> List[Dict[str, Any]]:
        """Returns the list of tools provided by the TradeToolKit."""
        return [
            {
                "type": "function",
                "function": {
                    "name": "log_field_report",
                    "description": "Logs a new field observation or report about a store or customer. Use this when the representative shares new information from the field.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "text": {
                                "type": "string",
                                "description": "The information to log."
                            },
                            "store_id": {
                                "type": "string",
                                "description": "Optional: The store ID this report belongs to."
                            }
                        },
                        "required": ["text"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_stores",
                    "description": "Retrieves the list of all stores and their regions, segments, and markets managed by this business. Use this when the user asks for a list of stores, regions, or locations we manage.",
                    "parameters": {
                        "type": "object",
                        "properties": {}
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_recent_orders",
                    "description": "Retrieves the recent orders placed for the business, optionally filtered by a specific store_id. Use this when the user asks for the latest/recent orders, order history, or last products sold to a store.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "store_id": {
                                "type": "string",
                                "description": "Optional: The store ID to filter the orders by."
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Optional: The maximum number of orders to return (default is 5)."
                            }
                        }
                    }
                }
            }
        ]

    async def log_field_report(self, business_id: str, text: str, store_id: str = None) -> Dict[str, Any]:
        """Trigger background ingestion for a field report."""
        if not store_id:
            return {
                "success": False,
                "error": "Cannot log field report: store_id is required to attach the report to an account. Please resolve the store first."
            }
        try:
            # Add context if store_id is known
            context_text = text
            if store_id:
                res_store = await self.db.execute(select(Store).where(Store.id == store_id))
                store = res_store.scalars().first()
                if store:
                    context_text = f"[STORE: {store.name}] {text}"
            
            # Trigger Celery task
            process_b2b_ingestion.delay(business_id, context_text)
            
            return {
                "success": True, 
                "message": "Field report has been queued for processing. It will be added to the account intelligence shortly."
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_stores(self, business_id: str) -> List[Dict[str, Any]]:
        """Retrieve all stores and their basic info (region, market, segment) for the business."""
        try:
            res = await self.db.execute(
                select(Store)
                .where(Store.business_id == business_id)
                .order_by(Store.name)
            )
            stores = res.scalars().all()
            return [
                {
                    "store_id": s.id,
                    "name": s.name,
                    "region": s.region,
                    "market": s.market,
                    "segment": s.segment,
                    "address": s.address
                }
                for s in stores
            ]
        except Exception as e:
            return {"error": str(e)}

    async def get_recent_orders(self, business_id: str, store_id: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Retrieve recent orders for the business, optionally filtered by store_id, including order items and products."""
        try:
            stmt = (
                select(Order)
                .where(Order.business_id == business_id)
                .options(
                    selectinload(Order.store),
                    selectinload(Order.client),
                    selectinload(Order.items).selectinload(OrderItem.product)
                )
                .order_by(Order.created_at.desc())
                .limit(limit)
            )
            
            if store_id:
                stmt = stmt.where(Order.store_id == store_id)
                
            res = await self.db.execute(stmt)
            orders = res.scalars().all()
            
            results = []
            for o in orders:
                items_data = []
                for item in o.items:
                    items_data.append({
                        "product_id": item.product_id,
                        "product_name": item.product.name if item.product else None,
                        "sku": item.product.sku if item.product else None,
                        "quantity": item.quantity,
                        "unit_price": item.unit_price
                    })
                
                results.append({
                    "order_id": o.id,
                    "store_id": o.store_id,
                    "store_name": o.store.name if o.store else None,
                    "client_id": o.client_id,
                    "client_name": o.client.name if o.client else None,
                    "status": o.status.value if hasattr(o.status, 'value') else o.status,
                    "total_amount": o.total_amount,
                    "notes": o.notes,
                    "created_at": o.created_at.isoformat() if o.created_at else None,
                    "delivery_date": o.delivery_date.isoformat() if o.delivery_date else None,
                    "items": items_data
                })
            return results
        except Exception as e:
            return {"error": str(e)}
