import re
from typing import Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.crm import Client

class IdentityResolver:
    @staticmethod
    def clean_identifier(val: str) -> str:
        return re.sub(r"\D", "", val)

    @staticmethod
    async def resolve_sender(db: AsyncSession, business_id: str, platform_id: str, is_telegram: bool = False) -> Tuple[str, Optional[Client]]:
        """
        Determines the sender's flow category:
        - 'sales_rep': Internal representative in the database.
        - 'distributor_retailer': A client associated with physical stores.
        - 'prospective_client': An unknown contact or designated prospect.
        """
        normalized_id = IdentityResolver.clean_identifier(platform_id)
        id_hash = Client.hash_id(normalized_id)

        # 1. Fetch Client with store relations pre-loaded
        query = select(Client).where(
            Client.business_id == business_id
        ).options(selectinload(Client.stores))

        if is_telegram:
            query = query.where(Client.telegram_id_hash == id_hash)
        else:
            query = query.where(
                (Client.whatsapp_id_hash == id_hash) | (Client.phone == normalized_id)
            )

        result = await db.execute(query)
        client = result.scalars().first()

        if not client:
            return "prospective_client", None

        # 2. Check representative status
        if client.role in ("representative", "sales_rep", "agent"):
            return "sales_rep", client

        # 3. Check physical store mappings
        if client.stores:
            return "distributor_retailer", client

        # 4. Fallback to prospect
        return "prospective_client", client
