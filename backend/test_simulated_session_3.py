import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.business import BusinessProfile
from app.models.trade import Category, Product, Store, StoreAction, ActionCategory, ActionStatus
from app.models.crm import Client
from app.models.messaging import Conversation, Message
from app.services.prospect_qualifier import ProspectQualifier

async def cleanup_database_records(db, biz_id, phone_numbers):
    """Clean up the checkpoints and crm records for the given phone numbers."""
    print("Cleaning database checkpoints and crm records...")
    for phone in phone_numbers:
        # Delete checkpointer entries
        thread_id = f"prospect_{phone}"
        await db.execute(text("DELETE FROM checkpoints WHERE thread_id = :tid"), {"tid": thread_id})
        await db.execute(text("DELETE FROM checkpoint_writes WHERE thread_id = :tid"), {"tid": thread_id})
        
        # Delete client, store, and actions
        client_id_hash = Client.hash_id(phone)
        res_cli = await db.execute(select(Client).where(Client.business_id == biz_id, Client.whatsapp_id_hash == client_id_hash))
        client = res_cli.scalars().first()
        if client:
            # Delete actions assigned to or created for client
            await db.execute(text("DELETE FROM store_actions WHERE assigned_to_id = :cid"), {"cid": client.id})
            
            # Delete clients store associations
            await db.execute(text("DELETE FROM store_clients WHERE client_id = :cid"), {"cid": client.id})
            
            # Find and delete associated prospect stores
            res_conv = await db.execute(select(Conversation).where(Conversation.client_id == client.id))
            convs = res_conv.scalars().all()
            for c in convs:
                await db.execute(text("DELETE FROM messages WHERE conversation_id = :cid"), {"cid": c.id})
                await db.delete(c)
                
            await db.delete(client)
            
    # Delete stores created for test cases
    await db.execute(text("DELETE FROM store_clients WHERE store_id IN (SELECT id FROM stores WHERE is_prospect = true AND name LIKE '%Obra%')"))
    await db.execute(text("DELETE FROM store_actions WHERE store_id IN (SELECT id FROM stores WHERE is_prospect = true AND name LIKE '%Obra%')"))
    await db.execute(text("DELETE FROM stores WHERE is_prospect = true AND name LIKE '%Obra%'"))
    
    await db.commit()
    print("Cleanup done.")

async def run_scenario(qualifier, biz_id, sender_phone, messages):
    print(f"\n--- RUNNING SCENARIO FOR {sender_phone} ---")
    is_completed = False
    response = ""
    for i, msg in enumerate(messages, 1):
        print(f"[Turn {i}] User: {msg}")
        response, is_completed = await qualifier.get_response(biz_id, sender_phone, msg)
        print(f"[Turn {i}] Agent: {response} (is_completed={is_completed})")
    return response, is_completed

async def main():
    print("Initializing Prospect Flow Integration Test...")
    async with SessionLocal() as db:
        # Retrieve a business profile
        res_biz = await db.execute(select(BusinessProfile).limit(1))
        biz = res_biz.scalars().first()
        if not biz:
            print("ERROR: No business profiles found.")
            sys.exit(1)
            
        print(f"Using business profile: {biz.name} ({biz.id})")
        
        # Ensure a valid product exists in the DB with a wholesale_threshold
        # Check for first category or create one
        res_cat = await db.execute(select(Category).where(Category.business_id == biz.id, Category.name == "Construcción").limit(1))
        cat = res_cat.scalars().first()
        if not cat:
            cat = Category(business_id=biz.id, name="Construcción", description="Materiales de Construcción")
            db.add(cat)
            await db.flush()
            
        res_prod = await db.execute(select(Product).where(Product.category_id == cat.id, Product.name == "Cemento Especial Especial (Saco 25kg)").limit(1))
        prod = res_prod.scalars().first()
        if not prod:
            prod = Product(
                category_id=cat.id,
                name="Cemento Especial Especial (Saco 25kg)",
                brand="Cemenquin",
                price=120.00,
                wholesale_threshold=80,
                unit_of_measure="saco"
            )
            db.add(prod)
            await db.flush()
        else:
            prod.wholesale_threshold = 80
            db.add(prod)
            await db.flush()
        # Ensure a physical store in Ciudad de México exists for coverage matching
        res_store_physical = await db.execute(
            select(Store).where(Store.business_id == biz.id, Store.name == "Sucursal CDMX Poniente", Store.is_prospect == False)
        )
        store_physical = res_store_physical.scalars().first()
        if not store_physical:
            store_physical = Store(
                business_id=biz.id,
                name="Sucursal CDMX Poniente",
                street_address="Av. Reforma 123",
                city="Ciudad de México",
                state="Ciudad de México",
                zip_code="01210",
                country="México",
                is_prospect=False,
                delivery_zip_codes=["01210", "04210"]
            )
            db.add(store_physical)
            await db.flush()
        else:
            store_physical.delivery_zip_codes = ["01210", "04210"]
            db.add(store_physical)
            await db.flush()
            
        await db.commit()
        print(f"Using product for test: {prod.name} (Wholesale threshold: {prod.wholesale_threshold})")
        
        test_phones = ["sandbox_test_qty_fail", "sandbox_test_zip_fail", "sandbox_test_success", "sandbox_test_multi_turn_waitlist"]
        await cleanup_database_records(db, biz.id, test_phones)
        
        qualifier = ProspectQualifier(db)
        
        # Scenario 1: Retail Referral on low quantity (< 80)
        # Expected: Flow prompts for delivery address, then prompts for name/email, registers retail referral and completes.
        response, is_comp = await run_scenario(
            qualifier, biz.id, "sandbox_test_qty_fail",
            [
                "Hola, me interesa comprar cemento",
                f"Quiero 10 bultos de {prod.name}",
                "Mi dirección es en Álvaro Obregón, CDMX, CP 01210",
                "Mi nombre es Juan Perez, y mi correo es juan@perez.com"
            ]
        )
        assert is_comp is True, "Scenario 1 should mark is_completed=True after contact details are provided"
        assert "referencia minorista" in response.lower() or "sucursal" in response.lower() or "registrado" in response.lower(), "Scenario 1 should refer user to physical store"
        
        # Verify retail Client in DB
        client_hash_1 = Client.hash_id("sandbox_test_qty_fail")
        res_cli_1 = await db.execute(select(Client).where(Client.business_id == biz.id, Client.whatsapp_id_hash == client_hash_1))
        client_1 = res_cli_1.scalars().first()
        assert client_1 is not None, "A retail prospect Client should have been created"
        assert client_1.prospect_segment == "retail", "Client segment should be retail"
        assert client_1.name == "Juan Perez", "Client name should match"
        
        # Verify retail Store in DB
        res_store_1 = await db.execute(select(Store).where(Store.business_id == biz.id, Store.is_prospect == True, Store.prospect_segment == "retail"))
        store_1 = res_store_1.scalars().first()
        assert store_1 is not None, "A retail prospect Store should have been created"
        assert store_1.prospect_segment == "retail", "Store segment should be retail"
        assert store_1.assigned_store_id is not None, "Store should have matched physical store reference"
        print("✅ SCENARIO 1 (Quantity Rejection Retail Referral) PASSED!")

        # Scenario 2: Waitlist on Out-of-Range ZIP Code
        # Expected: Passes quantity check (100 >= 80), prompts for info, receives invalid ZIP (64000 - Monterrey), transitions to waitlist registration, completes.
        response, is_comp = await run_scenario(
            qualifier, biz.id, "sandbox_test_zip_fail",
            [
                "Hola",
                f"Quiero 100 sacos de {prod.name}",
                "Mi nombre es Carlos Perez, tel 5543210987, correo carlos@perez.com, obra en Monterrey, CP 64000"
            ]
        )
        assert is_comp is True, "Scenario 2 should mark is_completed=True"
        assert "lista de espera" in response.lower(), "Scenario 2 should register user on waitlist"
        assert "64000" in response.lower(), "Scenario 2 response should mention waitlist zip code"
        
        # Verify waitlist Client in DB
        client_hash_2 = Client.hash_id("sandbox_test_zip_fail")
        res_cli_2 = await db.execute(select(Client).where(Client.business_id == biz.id, Client.whatsapp_id_hash == client_hash_2))
        client_2 = res_cli_2.scalars().first()
        assert client_2 is not None, "A waitlist prospect Client should have been created"
        assert client_2.phone == "5543210987", "Client phone should match Carlos Perez's phone"
        assert client_2.custom_fields.get("status") == "waitlist", "Client status should be waitlist"
        print("✅ SCENARIO 2 (ZIP Code Range Waitlist Registration) PASSED!")

        # Scenario 3: Successful Qualification
        # Expected: Passes quantity check, prompts info, receives CDMX ZIP (04210), creates Client (prospect=True), Store (prospect=True), StoreAction, logs notification, completes.
        response, is_comp = await run_scenario(
            qualifier, biz.id, "sandbox_test_success",
            [
                "Hola, buenas tardes",
                f"Necesito 120 bultos de {prod.name}",
                "Soy Bernardo Reyes, mi tel es 5522334455, correo bernardo@reyes.com, la obra es en Coyoacán, CP 04210, de la empresa Obras S.A."
            ]
        )
        assert is_comp is True, "Scenario 3 should mark is_completed=True"
        assert "hemos registrado tu solicitud" in response.lower(), "Scenario 3 should confirm lead registration"
        
        # Verify DB insertions
        client_hash = Client.hash_id("sandbox_test_success")
        res_cli = await db.execute(select(Client).where(Client.business_id == biz.id, Client.whatsapp_id_hash == client_hash))
        client = res_cli.scalars().first()
        assert client is not None, "A prospect Client should have been created"
        assert client.is_prospect is True, "Client should be marked as prospect"
        assert client.name == "Bernardo Reyes", "Client name should match extracted value"
        assert client.phone == "5522334455", "Client phone should match Bernardo Reyes's phone number"
        
        res_store = await db.execute(select(Store).where(Store.business_id == biz.id, Store.is_prospect == True, Store.name.like("%Obras S.A.%")))
        store = res_store.scalars().first()
        assert store is not None, "A prospect Store should have been created"
        assert "CP 04210" in store.address, "Store address should contain valid zip code"
        
        res_action = await db.execute(select(StoreAction).where(StoreAction.business_id == biz.id, StoreAction.store_id == store.id))
        action = res_action.scalars().first()
        assert action is not None, "A StoreAction entry should have been created"
        assert action.category == ActionCategory.COMMERCIAL, "StoreAction category should be COMMERCIAL"
        assert action.status == ActionStatus.PROPOSED, "StoreAction status should be PROPOSED"
        assert action.details["requested_quantity"] == 120, "StoreAction quantity should match"
        
        # Verify internal notification logs
        log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs", "notifications.log")
        assert os.path.exists(log_path), "Internal notification log file should have been created"
        with open(log_path, "r") as f:
            last_line = f.readlines()[-1]
            import json
            payload = json.loads(last_line)
            assert payload["lead_details"]["name"] == "Bernardo Reyes", "Notification details should match qualified client"
            
        print("✅ SCENARIO 3 (Successful Handoff & DB Verification) PASSED!")

        # Scenario 4: Greeting-based reset for returning clients
        # Expected: Sending greeting to completed flow resets state and returns greeting response rather than cached finished message.
        print("\n--- RUNNING SCENARIO 4: Greeting Reset ---")
        reset_response, is_comp_reset = await qualifier.get_response(biz.id, "sandbox_test_success", "Hola, me gustaría cotizar otros materiales")
        print(f"[Scenario 4] Reset Agent: {reset_response} (is_completed={is_comp_reset})")
        assert is_comp_reset is False, "Scenario 4 should reset checkpoints and start a new open flow (is_completed=False)"
        assert "catálogo" in reset_response.lower() or "producto" in reset_response.lower() or "bultos" in reset_response.lower() or "cantidad" in reset_response.lower(), "Should ask for product/quantity"
        print("✅ SCENARIO 4 (Greeting Reset & Re-Entry) PASSED!")

        # Scenario 5: Multi-Turn Waitlist flow
        # Expected: Passes quantity check, prompts for ZIP, receives CP 64000, apologizes and asks for details to put on waitlist, user provides contact info, registers on waitlist.
        print("\n--- RUNNING SCENARIO 5: Multi-Turn Waitlist Flow ---")
        response, is_comp = await run_scenario(
            qualifier, biz.id, "sandbox_test_multi_turn_waitlist",
            [
                "Hola, me interesa comprar cemento",
                f"Quiero 100 sacos de {prod.name}",
                "Mi obra es en Monterrey, CP 64000",
                "Soy Juan Perez, mi correo es juan@perez.com y mi tel es 5599887766, de la empresa Perez Constructores"
            ]
        )
        assert is_comp is True, "Scenario 5 should mark is_completed=True"
        assert "lista de espera" in response.lower(), "Scenario 5 should register user on waitlist"
        assert "64000" in response.lower(), "Scenario 5 response should mention waitlist zip code"
        
        # Verify waitlist Client in DB
        client_hash_5 = Client.hash_id("sandbox_test_multi_turn_waitlist")
        res_cli_5 = await db.execute(select(Client).where(Client.business_id == biz.id, Client.whatsapp_id_hash == client_hash_5))
        client_5 = res_cli_5.scalars().first()
        assert client_5 is not None, "A multi-turn waitlist prospect Client should have been created"
        assert client_5.phone == "5599887766", "Client phone should match Juan Perez's phone"
        assert client_5.custom_fields.get("status") == "waitlist", "Client status should be waitlist"
        print("✅ SCENARIO 5 (Multi-Turn Waitlist Flow) PASSED!")

        # Clean up database records after tests run successfully
        await cleanup_database_records(db, biz.id, test_phones)

if __name__ == "__main__":
    asyncio.run(main())
