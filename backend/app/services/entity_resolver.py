import unicodedata
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.trade import Store, store_clients
from app.models.crm import Client

class EntityResolver:
    def __init__(self, db: Any):
        self.db = db

    def _normalize_str(self, text: str, remove_spaces: bool = False) -> str:
        """Remove accents and normalize string for comparison."""
        if not text: return ""
        # Normalize to NFKD and remove non-spacing mark (accents)
        normalized = unicodedata.normalize('NFKD', text)
        result = "".join([c for c in normalized if not unicodedata.combining(c)]).lower().strip()
        if remove_spaces:
            return result.replace(" ", "")
        return result

    @staticmethod
    def get_tool_definition() -> Dict[str, Any]:
        """Returns the JSON schema for this tool."""
        return {
            "type": "function",
            "function": {
                "name": "resolve_entities",
                "description": "Detects Store or Contact names in the message and returns their IDs. Use this to identify which account or person the representative is talking about.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "text": {
                            "type": "string",
                            "description": "The user message or fragment to analyze for entity names."
                        }
                    },
                    "required": ["text"]
                }
            }
        }

    async def resolve_entities(self, business_id: str, text: str) -> Dict[str, Any]:
        """
        Resolves Store and Contact from the text.
        Returns a dict with detected IDs, names, and confidence levels.
        """
        msg_norm = self._normalize_str(text)
        msg_no_spaces = self._normalize_str(text, remove_spaces=True)
        
        result = {
            "store_id": None,
            "store_name": None,
            "contact_id": None,
            "contact_name": None,
            "confidence": 0.0,
            "source": None
        }

        # 1. Fetch names of all stores and contacts for this business
        res_stores = await self.db.execute(select(Store).where(Store.business_id == business_id))
        stores = res_stores.scalars().all()
        
        res_contacts = await self.db.execute(select(Client).where(Client.business_id == business_id))
        contacts = res_contacts.scalars().all()

        # 2. Check Store Names (Highest Priority)
        for s in stores:
            s_norm = self._normalize_str(s.name)
            s_no_spaces = self._normalize_str(s.name, remove_spaces=True)
            
            # Match if store name is in message, or if message (at least 4 chars) is in store name
            # Improved: match ignoring spaces (e.g. "supermercadito" vs "super mercadito")
            if (s_norm in msg_norm or (len(msg_norm) >= 4 and msg_norm in s_norm) or
                s_no_spaces in msg_no_spaces or (len(msg_no_spaces) >= 4 and msg_no_spaces in s_no_spaces)):
                result["store_id"] = s.id
                result["store_name"] = s.name
                result["confidence"] = 1.0
                result["source"] = "store_name_match"
                break

        # 3. Check Contact Names
        if not result["store_id"]:
            for c in contacts:
                c_norm = self._normalize_str(c.name)
                c_no_spaces = self._normalize_str(c.name, remove_spaces=True)
                
                if (c_norm in msg_norm or (len(msg_norm) >= 4 and msg_norm in c_norm) or
                    c_no_spaces in msg_no_spaces or (len(msg_no_spaces) >= 4 and msg_no_spaces in c_no_spaces)):
                    result["contact_id"] = c.id
                    result["contact_name"] = c.name
                    # If no store found via name, try to find linked store
                    res_link = await self.db.execute(
                        select(Store).join(store_clients).where(store_clients.c.client_id == c.id).limit(1)
                    )
                    linked_store = res_link.scalars().first()
                    if linked_store:
                        # Handle mock strings and real objects
                        result["store_id"] = linked_store.id if hasattr(linked_store, "id") else linked_store
                        result["store_name"] = linked_store.name if hasattr(linked_store, "name") else "Linked Store"
                    result["confidence"] = 0.9
                    result["source"] = "contact_name_match"
                    break

        return result
