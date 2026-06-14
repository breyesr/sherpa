import unicodedata
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.trade import Store, store_clients
from app.models.crm import Client

class EntityResolver:
    def __init__(self, db: Any):
        self.db = db

    def _normalize_str(self, text: str) -> str:
        """Remove accents and normalize string for comparison."""
        if not text: return ""
        # Normalize to NFKD and remove non-spacing mark (accents)
        normalized = unicodedata.normalize('NFKD', text)
        return "".join([c for c in normalized if not unicodedata.combining(c)]).lower().strip()

    async def resolve_entities(self, business_id: str, user_message: str) -> Dict[str, Any]:
        """
        Resolves Store and Contact from the user message.
        Returns a dict with detected IDs and confidence levels.
        """
        msg_norm = self._normalize_str(user_message)
        result = {
            "store_id": None,
            "contact_id": None,
            "confidence": 0.0,
            "source": None
        }

        # 1. Fetch names of all stores and contacts for this business
        # Note: In high-scale, this should be cached in Redis
        res_stores = await self.db.execute(select(Store).where(Store.business_id == business_id))
        stores = res_stores.scalars().all()
        
        res_contacts = await self.db.execute(select(Client).where(Client.business_id == business_id))
        contacts = res_contacts.scalars().all()

        # 2. Check Store Names (Highest Priority)
        for s in stores:
            if self._normalize_str(s.name) in msg_norm:
                result["store_id"] = s.id
                result["confidence"] = 1.0
                result["source"] = "store_name_match"
                break

        # 3. Check Contact Names (If no store found or to supplement)
        for c in contacts:
            if self._normalize_str(c.name) in msg_norm:
                result["contact_id"] = c.id
                if not result["store_id"]:
                    # Find store linked to this contact
                    res_link = await self.db.execute(
                        select(store_clients.c.store_id).where(store_clients.c.client_id == c.id)
                    )
                    s_id = res_link.scalars().first()
                    if s_id:
                        result["store_id"] = s_id
                        result["confidence"] = 0.9
                        result["source"] = "contact_name_match"
                break

        return result
