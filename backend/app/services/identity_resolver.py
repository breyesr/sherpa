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

        # Fetch business to get contact_phone
        from app.models.business import BusinessProfile, VerticalType
        result_biz = await db.execute(select(BusinessProfile).where(BusinessProfile.id == business_id))
        business = result_biz.scalars().first()
        is_b2c = business and business.vertical_type == VerticalType.BASIC
        biz_phone = IdentityResolver.clean_identifier(business.contact_phone) if business and business.contact_phone else None

        # Check Telegram Admin integration setting
        if is_telegram:
            from app.models.integration import Integration
            from app.core.security import encrypt_token
            res_int = await db.execute(
                select(Integration)
                .where(Integration.business_id == business_id, Integration.provider == "telegram")
            )
            tg_integration = res_int.scalars().first()
            if tg_integration and tg_integration.settings and str(tg_integration.settings.get("admin_telegram_id")) == str(normalized_id):
                # This is the linked Telegram admin! Find or create a sales rep Client record
                # Query by telegram_id_hash first to avoid unique key violations
                res_biz_cli = await db.execute(
                    select(Client).where(Client.business_id == business_id, Client.telegram_id_hash == id_hash)
                )
                client = res_biz_cli.scalars().first()
                
                if not client and biz_phone:
                    # Fallback: Query by phone
                    res_biz_cli_phone = await db.execute(
                        select(Client).where(Client.business_id == business_id, Client.phone == biz_phone)
                    )
                    client = res_biz_cli_phone.scalars().first()
                    
                if not client:
                    client = Client(
                        business_id=business_id,
                        name="Sales Rep (Admin)",
                        phone=biz_phone,
                        role="sales_rep",
                        is_prospect=False,
                        telegram_id=encrypt_token(normalized_id),
                        telegram_id_hash=id_hash
                    )
                    db.add(client)
                    await db.commit()
                    await db.refresh(client)
                elif not client.telegram_id_hash or client.telegram_id_hash != id_hash:
                    # Update existing client with Telegram ID
                    client.telegram_id = encrypt_token(normalized_id)
                    client.telegram_id_hash = id_hash
                    db.add(client)
                    await db.commit()
                    await db.refresh(client)
                
                return "sales_rep", client

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

        # If not found, check if this is the business contact phone on WhatsApp
        if not client and not is_telegram and biz_phone and normalized_id == biz_phone:
            # Find or create a sales rep Client record for the business contact phone
            res_biz_cli = await db.execute(
                select(Client).where(Client.business_id == business_id, Client.phone == biz_phone)
            )
            client = res_biz_cli.scalars().first()
            if not client:
                client = Client(
                    business_id=business_id,
                    name="Sales Rep (Admin)",
                    phone=biz_phone,
                    role="sales_rep",
                    is_prospect=False
                )
                db.add(client)
                await db.commit()
                await db.refresh(client)

        if not client:
            return "customer" if is_b2c else "prospective_client", None

        if is_b2c:
            return "customer", client

        # 2. Check representative status
        if (client.role in ("representative", "sales_rep", "agent")) or (biz_phone and client.phone == biz_phone):
            return "sales_rep", client

        # 2.5. Check prospect override to avoid feature gate blocks for saved prospects
        if client.is_prospect:
            return "prospective_client", client

        # 3. Check physical store mappings
        if client.stores:
            return "distributor_retailer", client

        # 4. Fallback to prospect
        return "prospective_client", client
