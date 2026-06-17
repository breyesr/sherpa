import json
from typing import Dict, Any, Optional, List
from sqlalchemy.future import select
from app.models.trade import AccountIntelligence, Store
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
            }
        ]

    async def log_field_report(self, business_id: str, text: str, store_id: str = None) -> Dict[str, Any]:
        """Trigger background ingestion for a field report."""
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
