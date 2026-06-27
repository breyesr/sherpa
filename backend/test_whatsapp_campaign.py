import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.business import BusinessProfile
from app.models.trade import Category, Product, Store, StoreAction, ActionCategory, ActionStatus
from app.models.crm import Client
from app.models.messaging import Conversation, Message
from app.services.prospect_qualifier import ProspectQualifier

async def setup_test_data(db, business_id: str):
    # Ensure there is a category
    res_cat = await db.execute(select(Category).where(Category.business_id == business_id).limit(1))
    category = res_cat.scalars().first()
    
    if not category:
        category = Category(
            business_id=business_id,
            name="Refrescos",
            description="Bebidas carbonatadas"
        )
        db.add(category)
        await db.flush()
        
    # Ensure a product with wholesale threshold exists
    res_prod = await db.execute(
        select(Product).join(Category).where(Category.business_id == business_id, Product.name == "Super Soda 3000")
    )
    product = res_prod.scalars().first()
    
    if not product:
        product = Product(
            category_id=category.id,
            name="Super Soda 3000",
            brand="Sherpa Brand",
            price=2.5,
            wholesale_threshold=50,
            unit_of_measure="caja"
        )
        db.add(product)
        await db.flush()
    else:
        product.wholesale_threshold = 50
        
    # Ensure some physical stores exist for location matching
    res_store = await db.execute(select(Store).where(Store.business_id == business_id, Store.name == "Sucursal Monterrey Centro"))
    store = res_store.scalars().first()
    if not store:
        store = Store(
            business_id=business_id,
            name="Sucursal Monterrey Centro",
            address="Av. Constitución 456, Monterrey, Nuevo León, CP 64000",
            phone="8111223344"
        )
        db.add(store)
        await db.flush()
        
    await db.commit()
    return product

async def test_above_threshold(business_id: str, product: Product):
    print("\n--- SIMULATION 1: ABOVE-THRESHOLD FLOW (WHOLESALE LEAD) ---")
    async with SessionLocal() as db:
        qualifier = ProspectQualifier(db)
        sender_phone = "525511223344"
        
        # Turn 1: Initial interest
        print("[PROSPECT]: Hola, estoy interesado en el producto Super Soda 3000")
        response, is_comp = await qualifier.get_response(business_id, sender_phone, "Hola, estoy interesado en el producto Super Soda 3000")
        print(f"[BOT]: {response} (Completed: {is_comp})\n")
        
        # Turn 2: Quantity
        print("[PROSPECT]: Quiero 100 cajas")
        response, is_comp = await qualifier.get_response(business_id, sender_phone, "Quiero 100 cajas")
        print(f"[BOT]: {response} (Completed: {is_comp})\n")
        
        # Turn 3: Location
        print("[PROSPECT]: Las necesito en Av. Constituyentes 123, Ciudad de México, CP 01000")
        response, is_comp = await qualifier.get_response(business_id, sender_phone, "Las necesito en Av. Constituyentes 123, Ciudad de México, CP 01000")
        print(f"[BOT]: {response} (Completed: {is_comp})\n")
        
        # Turn 4: Contact details
        contact_info = "Mi teléfono es +525511223344, mi correo es gerardo@distribuidor.com y mi empresa es Distribuidora G"
        print(f"[PROSPECT]: {contact_info}")
        response, is_comp = await qualifier.get_response(business_id, sender_phone, contact_info)
        print(f"[BOT]: {response} (Completed: {is_comp})\n")
        
        # Verify database entities
        assert is_comp is True, "Flow should be completed"
        
        # Fetch Client
        id_hash = Client.hash_id(sender_phone)
        res_cli = await db.execute(select(Client).where(Client.business_id == business_id, Client.whatsapp_id_hash == id_hash))
        client = res_cli.scalars().first()
        assert client is not None, "Client should be created"
        assert client.email == "gerardo@distribuidor.com"
        assert client.custom_fields.get("company") == "Distribuidora G"
        
        # Fetch Store
        res_store = await db.execute(select(Store).where(Store.business_id == business_id, Store.name == "Distribuidora G (Obra WhatsApp)"))
        store = res_store.scalars().first()
        assert store is not None, "Store should be created"
        assert "Av. Constituyentes 123" in store.address
        
        # Fetch Action
        res_act = await db.execute(select(StoreAction).where(StoreAction.business_id == business_id, StoreAction.store_id == store.id))
        action = res_act.scalars().first()
        assert action is not None, "StoreAction should be created"
        assert action.category == ActionCategory.COMMERCIAL
        assert action.status == ActionStatus.PROPOSED
        assert action.assigned_to_id == client.id
        
        print("✅ SUCCESS: Above-threshold flow qualified lead, created CRM contact, created store record, and created representative call task.")

async def test_below_threshold(business_id: str, product: Product):
    print("\n--- SIMULATION 2: BELOW-THRESHOLD FLOW (RETAIL DIRECT) ---")
    async with SessionLocal() as db:
        qualifier = ProspectQualifier(db)
        sender_phone = "525599887766"
        
        # Turn 1: Initial interest
        print("[PROSPECT]: Buenas tardes, venden Super Soda 3000?")
        response, is_comp = await qualifier.get_response(business_id, sender_phone, "Buenas tardes, venden Super Soda 3000?")
        print(f"[BOT]: {response} (Completed: {is_comp})\n")
        
        # Turn 2: Quantity
        print("[PROSPECT]: Quisiera comprar 10 unidades")
        response, is_comp = await qualifier.get_response(business_id, sender_phone, "Quisiera comprar 10 unidades")
        print(f"[BOT]: {response} (Completed: {is_comp})\n")
        
        # Turn 3: Location
        print("[PROSPECT]: Estoy en Monterrey, CP 64000")
        response, is_comp = await qualifier.get_response(business_id, sender_phone, "Estoy en Monterrey, CP 64000")
        print(f"[BOT]: {response} (Completed: {is_comp})\n")
        
        # Turn 4: Contact details
        contact_info = "Celular: +525599887766, correo: pedro@correo.com, empresa: La Tiendita de Pedro"
        print(f"[PROSPECT]: {contact_info}")
        response, is_comp = await qualifier.get_response(business_id, sender_phone, contact_info)
        print(f"[BOT]: {response} (Completed: {is_comp})\n")
        
        assert is_comp is True, "Flow should be completed"
        assert "Monterrey Centro" in response or "Av. Constitución" in response, "Should recommend Monterrey store"
        
        print("✅ SUCCESS: Below-threshold flow direct-to-store logic executed successfully.")

async def main():
    from sqlalchemy import text, delete
    from app.models.trade import store_clients
    async with SessionLocal() as db:
        # 1. Clean up database records for test phones to ensure repeatability
        try:
            # Find client ids for the test phones
            id_hash_1 = Client.hash_id("525511223344")
            id_hash_2 = Client.hash_id("525599887766")
            res_cli = await db.execute(select(Client.id).where(Client.whatsapp_id_hash.in_([id_hash_1, id_hash_2])))
            client_ids = res_cli.scalars().all()
            
            if client_ids:
                # Delete store actions assigned to or created by these clients
                await db.execute(delete(StoreAction).where(StoreAction.assigned_to_id.in_(client_ids)))
                
                # Find store ids linked to these clients via store_clients link table
                res_sc = await db.execute(select(store_clients.c.store_id).where(store_clients.c.client_id.in_(client_ids)))
                linked_store_ids = res_sc.scalars().all()
                
                # Delete from store_clients link table
                await db.execute(store_clients.delete().where(store_clients.c.client_id.in_(client_ids)))
                
                if linked_store_ids:
                    # Delete store actions for these stores
                    await db.execute(delete(StoreAction).where(StoreAction.store_id.in_(linked_store_ids)))
                    # Delete the stores themselves
                    await db.execute(delete(Store).where(Store.id.in_(linked_store_ids)))
                    
                # Delete clients
                await db.execute(delete(Client).where(Client.id.in_(client_ids)))
                
            # 2. Delete conversations and messages
            res_conv = await db.execute(select(Conversation.id).where(Conversation.platform_chat_id.in_(["525511223344", "525599887766"])))
            conv_ids = res_conv.scalars().all()
            if conv_ids:
                await db.execute(delete(Message).where(Message.conversation_id.in_(conv_ids)))
            await db.execute(delete(Conversation).where(Conversation.platform_chat_id.in_(["525511223344", "525599887766"])))
            
            # 3. Delete checkpointer entries
            await db.execute(text("DELETE FROM checkpoints WHERE thread_id IN ('prospect_525511223344', 'prospect_525599887766')"))
            await db.execute(text("DELETE FROM checkpoint_writes WHERE thread_id IN ('prospect_525511223344', 'prospect_525599887766')"))
            await db.commit()
        except Exception as ce:
            print(f"Cleanup warning: {ce}")
            await db.rollback()

        # Use first active business in DB
        res_biz = await db.execute(select(BusinessProfile).limit(1))
        biz = res_biz.scalars().first()
        if not biz:
            print("ERROR: No business profiles found in database. Run database seed first.")
            return
        
        print(f"Using business profile: {biz.name} ({biz.id})")
        product = await setup_test_data(db, biz.id)
        
    await test_above_threshold(biz.id, product)
    await test_below_threshold(biz.id, product)

if __name__ == "__main__":
    asyncio.run(main())
