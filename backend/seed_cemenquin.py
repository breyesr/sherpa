import asyncio
import os
import sys
import datetime
from decimal import Decimal
from sqlalchemy.future import select
from sqlalchemy import delete, text
from sqlalchemy.orm import selectinload

# Ensure backend folder is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.business import BusinessProfile, Agent, VerticalType
from app.models.user import User
from app.models.trade import (
    Category, Product, Store, StoreNote, Order, OrderItem,
    Competitor, CustomerNote, ActionTemplate, StoreAction,
    ActionCategory, ActionStatus, DataSourceType, OrderStatus,
    store_clients, StoreActionObjective
)
from app.models.crm import Client
from app.models.messaging import Conversation, Message
from app.models.knowledge import KnowledgeCorpus, KnowledgeEntityType
from app.core.embeddings import EmbeddingService
from app.core.ai_service import AIService
from app.services.prospect_qualifier import ProspectQualifier
from app.core.postal_seeder import seed_postal_codes

async def seed_data():
    biz_id = "06a3ac9d-26a9-78dc-8000-98268a466415"
    user_id = "06a3ac99-70fa-70d7-8000-27cc2f5e5b81"
    
    print("🚀 Starting Cemenquin Seed Process...")
    
    async with SessionLocal() as db:
        # Seed postal code lookups
        await seed_postal_codes(db)
        # --- 1. CLEANUP OLD DATA ---
        print("Cleaning up existing data for Cemenquin business profile...")
        
        # Clear checkpointer entries for our mock phones
        mock_phones = ["+528189012345", "+525567890123", "+529990123456", "+525544332211"]
        normalized_mock_phones = [Client.normalize_id(p) for p in mock_phones]
        thread_ids = normalized_mock_phones + [f"prospect_{p}" for p in normalized_mock_phones]
        
        for t_id in thread_ids:
            await db.execute(text("DELETE FROM checkpoints WHERE thread_id = :tid"), {"tid": t_id})
            await db.execute(text("DELETE FROM checkpoint_writes WHERE thread_id = :tid"), {"tid": t_id})
            
        # Delete related entities
        await db.execute(delete(KnowledgeCorpus).where(KnowledgeCorpus.business_id == biz_id))
        await db.execute(delete(StoreAction).where(StoreAction.business_id == biz_id))
        await db.execute(delete(StoreActionObjective).where(StoreActionObjective.business_id == biz_id))
        await db.execute(delete(CustomerNote).where(CustomerNote.business_id == biz_id))
        await db.execute(delete(Competitor).where(Competitor.business_id == biz_id))
        
        res_orders = await db.execute(select(Order.id).where(Order.business_id == biz_id))
        order_ids = res_orders.scalars().all()
        if order_ids:
            await db.execute(delete(OrderItem).where(OrderItem.order_id.in_(order_ids)))
        await db.execute(delete(Order).where(Order.business_id == biz_id))
        
        res_stores = await db.execute(select(Store.id).where(Store.business_id == biz_id))
        store_ids = res_stores.scalars().all()
        if store_ids:
            await db.execute(delete(StoreNote).where(StoreNote.store_id.in_(store_ids)))
            await db.execute(text("DELETE FROM store_clients WHERE store_id IN (SELECT id FROM stores WHERE business_id = :biz_id)"), {"biz_id": biz_id})
            
        await db.execute(delete(StoreAction).where(StoreAction.business_id == biz_id))
        await db.execute(delete(StoreActionObjective).where(StoreActionObjective.business_id == biz_id))
        await db.execute(delete(Client).where(Client.business_id == biz_id))
        await db.execute(delete(Store).where(Store.business_id == biz_id))
        await db.execute(delete(ActionTemplate).where(ActionTemplate.business_id == biz_id))
        
        res_cats = await db.execute(select(Category.id).where(Category.business_id == biz_id))
        cat_ids = res_cats.scalars().all()
        if cat_ids:
            await db.execute(delete(Product).where(Product.category_id.in_(cat_ids)))
        await db.execute(delete(Category).where(Category.business_id == biz_id))
        
        res_convs = await db.execute(select(Conversation.id).where(Conversation.business_id == biz_id))
        conv_ids = res_convs.scalars().all()
        if conv_ids:
            await db.execute(delete(Message).where(Message.conversation_id.in_(conv_ids)))
        await db.execute(delete(Conversation).where(Conversation.business_id == biz_id))
        
        await db.commit()
        print("Cleanup completed successfully.")

        # Ensure BusinessProfile is set to VerticalType.TRADE and active, eager-loading agents
        res_biz = await db.execute(
            select(BusinessProfile)
            .options(selectinload(BusinessProfile.agents))
            .where(BusinessProfile.id == biz_id)
        )
        biz = res_biz.scalars().first()
        if not biz:
            print(f"ERROR: Business Profile {biz_id} not found. Creating one...")
            biz = BusinessProfile(
                id=biz_id,
                user_id=user_id,
                name="Cemenquin",
                category="Construcción",
                timezone="America/Mexico_City",
                vertical_type=VerticalType.TRADE,
                is_active=True,
                routing_config={"prospective_clients": {"enabled": True}, "distributors_retailers": {"enabled": True}, "sales_reps": {"enabled": True}},
                features_config={"scheduling": {"enabled": True}, "business_identity": {"enabled": True}, "crm_suite": {"enabled": True}, "campaign_flow": {"enabled": True}, "b2b_solutions": {"enabled": True}, "sales_intelligence": {"enabled": True}}
            )
            db.add(biz)
            await db.commit()
            
            # Fetch again with agents
            res_biz = await db.execute(
                select(BusinessProfile)
                .options(selectinload(BusinessProfile.agents))
                .where(BusinessProfile.id == biz_id)
            )
            biz = res_biz.scalars().first()
        else:
            biz.vertical_type = VerticalType.TRADE
            biz.is_active = True
            db.add(biz)
            await db.commit()
            print("BusinessProfile set to TRADE vertical.")

        # Seed Dynamic Store Action Objectives
        print("Seeding store action objectives...")
        default_objectives = [
            StoreActionObjective(business_id=biz_id, name="THREAT_RESPONSE", label="THREAT_RESPONSE", category=ActionCategory.COMMERCIAL, description="Acción de respuesta rápida ante movimientos de competidores directos en la zona."),
            StoreActionObjective(business_id=biz_id, name="THREAT_RESPONSE", label="THREAT_RESPONSE", category=ActionCategory.MARKETING, description="Acción de respuesta rápida ante movimientos de competidores directos en la zona."),
            StoreActionObjective(business_id=biz_id, name="SHARE_OF_SHELF", label="Share of Shelf", category=ActionCategory.MARKETING, description="Medición y auditoría de la participación en anaquel de nuestros productos."),
            StoreActionObjective(business_id=biz_id, name="NEW_PRODUCT_INTRODUCTION", label="new product introduction", category=ActionCategory.COMMERCIAL, description="Acción para presentar o vender nuevos lanzamientos de catálogo."),
            StoreActionObjective(business_id=biz_id, name="NEW_PRODUCT_INTRODUCTION", label="new product introduction", category=ActionCategory.MARKETING, description="Acción para presentar o vender nuevos lanzamientos de catálogo."),
            StoreActionObjective(business_id=biz_id, name="INVENTORY_VELOCITY_OOS_PREVENTION", label="Inventory Velocity & OOS Prevention", category=ActionCategory.COMMERCIAL, description="Acción para reabastecer inventario, acelerar rotación y prevenir agotados."),
            StoreActionObjective(business_id=biz_id, name="PERFECT_STORE_ASSORTMENT_COMPLIANCE", label='"Perfect Store" & Assortment Compliance', category=ActionCategory.COMMERCIAL, description="Auditoría y ejecución de estándares de Tienda Perfecta y cumplimiento de portafolio."),
            StoreActionObjective(business_id=biz_id, name="PERFECT_STORE_ASSORTMENT_COMPLIANCE", label='"Perfect Store" & Assortment Compliance', category=ActionCategory.MARKETING, description="Auditoría y ejecución de estándares de Tienda Perfecta y cumplimiento de portafolio."),
            StoreActionObjective(business_id=biz_id, name="SEASONAL_EVENT_ACTIVATION", label="Seasonal & Event Activation", category=ActionCategory.MARKETING, description="Acciones promocionales especiales por temporalidad, festividades o eventos del canal."),
            StoreActionObjective(business_id=biz_id, name="TRADE_LOYALTY_VOLUME_PUSHING", label="Trade Loyalty & Volume Pushing (Sell-In)", category=ActionCategory.COMMERCIAL, description="Campaña de fidelización del canal de distribución y colocación de pedidos de volumen."),
            StoreActionObjective(business_id=biz_id, name="POSM_MAINTENANCE_ASSET_PURITY", label="POSM Maintenance & Asset Purity", category=ActionCategory.MARKETING, description="Auditoría, mantenimiento y colocación de material publicitario (POSM) y pureza de exhibidores.")
        ]
        for obj in default_objectives:
            db.add(obj)
        await db.commit()

        # --- 2. SEED CATEGORIES & PRODUCTS ---
        print("Seeding Categories & Products...")
        cat_gris = Category(business_id=biz_id, name="Cemento Gris", description="Cemento gris de alta resistencia estructural", category_type="Gris")
        cat_blanco = Category(business_id=biz_id, name="Cemento Blanco Special", description="Cemento blanco para acabados y detalles arquitectónicos", category_type="Blanco")
        cat_morteros = Category(business_id=biz_id, name="Morteros y Aditivos", description="Morteros listos para usar y aditivos impermeabilizantes", category_type="Especialidades")
        
        db.add_all([cat_gris, cat_blanco, cat_morteros])
        await db.flush() # Populate IDs

        prod1 = Product(category_id=cat_gris.id, name="Cemento Gris CPC 30 R (Saco 50kg)", description="Ideal para losas, columnas y trabes.", price=220.0, sku="CG-CPC30-50", product_type="Cemento", brand="Cemenquin", unit_of_measure="Saco 50kg", wholesale_threshold=100)
        prod2 = Product(category_id=cat_gris.id, name="Cemento Gris CPC 40 (Saco 50kg)", description="Para obras de alta resistencia estructural.", price=245.0, sku="CG-CPC40-50", product_type="Cemento", brand="Cemenquin", unit_of_measure="Saco 50kg", wholesale_threshold=100)
        prod3 = Product(category_id=cat_blanco.id, name="Cemento Blanco Especial (Saco 25kg)", description="Excelente blancura y durabilidad para fachadas y albercas.", price=190.0, sku="CB-ESP-25", product_type="Cemento", brand="Cemenquin", unit_of_measure="Saco 25kg", wholesale_threshold=50)
        prod4 = Product(category_id=cat_morteros.id, name="Mortero Seco de Alta Resistencia (Saco 40kg)", description="Mezcla lista de cemento y arena para aplanados y pegado de block.", price=135.0, sku="MS-AR-40", product_type="Mortero", brand="Cemenquin", unit_of_measure="Saco 40kg", wholesale_threshold=100)
        prod5 = Product(category_id=cat_morteros.id, name="Aditivo Impermeabilizante Líquido (Garrafa 19L)", description="Reduce la permeabilidad y aumenta la durabilidad del concreto.", price=850.0, sku="AD-IMP-19", product_type="Aditivo", brand="Cemenquin", unit_of_measure="Garrafa 19L", wholesale_threshold=10)

        db.add_all([prod1, prod2, prod3, prod4, prod5])
        await db.flush()
        print("Categories & Products seeded.")

        # --- 3. SEED ACTION TEMPLATES ---
        print("Seeding Action Templates...")
        t_comm = ActionTemplate(business_id=biz_id, name="Descuento por volumen", category=ActionCategory.COMMERCIAL, default_unit="pesos", description="Establecer descuentos y plazos de crédito especiales por compras a granel")
        t_mkt = ActionTemplate(business_id=biz_id, name="Material Promocional y Puntos de Venta", category=ActionCategory.MARKETING, default_unit="piezas", description="Entregar lonas, gorras, folletos y playeras promocionales de Cemenquin")
        
        db.add_all([t_comm, t_mkt])
        await db.flush()

        # --- 4. SEED STORES & CLIENTS ---
        print("Seeding Stores & Clients...")
        # 3 Active Stores & 1 Prospect Store
        store1 = Store(
            business_id=biz_id,
            name="Materiales Rivera del Norte",
            street_address="Av. Manuel Ávila Camacho 456",
            colonia="Monterrey Centro",
            municipality="Monterrey",
            city="Monterrey",
            state="Nuevo León",
            zip_code="64000",
            country="México",
            phone="+528189012345",
            email="ventas@riveranorte.com",
            market="Distribuidor",
            segment="A",
            region="Norte",
            opening_date=datetime.date(2025, 1, 15),
            is_prospect=False,
            delivery_zip_codes=["03330", "03310"]
        )
        store2 = Store(
            business_id=biz_id,
            name="Ferretería El Progreso CDMX",
            street_address="Calzada de Tlalpan 1209",
            colonia="Portales Oriente",
            municipality="Benito Juárez",
            city="CDMX",
            state="CDMX",
            zip_code="04220",
            country="México",
            phone="+525567890123",
            email="contacto@progreso.com",
            market="Minorista",
            segment="B",
            region="Centro",
            opening_date=datetime.date(2025, 3, 10),
            is_prospect=False,
            delivery_zip_codes=["04210", "04220", "04510"]
        )
        store3 = Store(
            business_id=biz_id,
            name="Constructora y Blockera Maya",
            street_address="Paseo de Montejo 88",
            colonia="Mérida Centro",
            municipality="Mérida",
            city="Mérida",
            state="Yucatán",
            zip_code="97000",
            country="México",
            phone="+529990123456",
            email="carlos@blockeramaya.com",
            market="Constructor",
            segment="A",
            region="Sur",
            opening_date=datetime.date(2024, 11, 20),
            is_prospect=False,
            delivery_zip_codes=["05000", "05100"]
        )
        store_prospect = Store(
            business_id=biz_id,
            name="Distribuidora del Centro (Prospecto)",
            street_address="Av. Juárez 500",
            colonia="Puebla Centro",
            municipality="Puebla",
            city="Puebla",
            state="Puebla",
            zip_code="72000",
            country="México",
            phone="+525544332211",
            email="puebla@prospecto.com",
            market="Minorista",
            segment="C",
            region="Centro",
            opening_date=datetime.date(2026, 5, 1),
            is_prospect=True
        )

        db.add_all([store1, store2, store3, store_prospect])
        await db.flush()

        # 3 Active Clients & 1 Prospect Client
        client1 = Client(business_id=biz_id, name="Mateo Rivera", phone="+528189012345", email="mateo@riveranorte.com", role="Dueño / Director General", is_prospect=False)
        client2 = Client(business_id=biz_id, name="Sofía Ortiz", phone="+525567890123", email="sofia.ortiz@progreso.com", role="Gerente de Compras", is_prospect=False)
        client3 = Client(business_id=biz_id, name="Carlos Méndez", phone="+529990123456", email="carlos@blockeramaya.com", role="Jefe de Proyectos", is_prospect=False)
        client_prospect = Client(business_id=biz_id, name="Juan Carlos Gómez (Prospecto)", phone="+525544332211", email="juan@prospecto.com", role="Propietario", is_prospect=True)

        db.add_all([client1, client2, client3, client_prospect])
        await db.flush()

        # Link clients to stores directly using association table inserts to avoid lazy-loading Greenlet error
        await db.execute(store_clients.insert().values(store_id=store1.id, client_id=client1.id))
        await db.execute(store_clients.insert().values(store_id=store2.id, client_id=client2.id))
        await db.execute(store_clients.insert().values(store_id=store3.id, client_id=client3.id))
        await db.execute(store_clients.insert().values(store_id=store_prospect.id, client_id=client_prospect.id))

        print("Stores & Clients seeded and linked.")

        # --- 5. SEED ORDERS & ORDER ITEMS ---
        print("Seeding historical Orders (2-month timeline)...")
        now = datetime.datetime.utcnow()
        
        # Order 1: Store 1, 50 days ago (Delivered)
        o1 = Order(business_id=biz_id, store_id=store1.id, client_id=client1.id, status=OrderStatus.DELIVERED, notes="Primer pedido grande de cemento gris", source_type=DataSourceType.MANUAL, is_verified=True, delivery_date=(now - datetime.timedelta(days=48)).date(), payment_method="Transferencia", shipping_address=store1.address, created_at=now - datetime.timedelta(days=50))
        db.add(o1)
        await db.flush()
        oi1 = OrderItem(order_id=o1.id, product_id=prod1.id, quantity=400, unit_price=220.0)
        oi2 = OrderItem(order_id=o1.id, product_id=prod2.id, quantity=100, unit_price=245.0)
        db.add_all([oi1, oi2])
        o1.total_amount = (400 * 220.0) + (100 * 245.0)

        # Order 2: Store 1, 35 days ago (Delivered)
        o2 = Order(business_id=biz_id, store_id=store1.id, client_id=client1.id, status=OrderStatus.DELIVERED, notes="Descuento especial por volumen aplicado", source_type=DataSourceType.MANUAL, is_verified=True, delivery_date=(now - datetime.timedelta(days=33)).date(), payment_method="Transferencia", shipping_address=store1.address, created_at=now - datetime.timedelta(days=35))
        db.add(o2)
        await db.flush()
        oi3 = OrderItem(order_id=o2.id, product_id=prod1.id, quantity=500, unit_price=215.0) # $5 discount
        db.add(oi3)
        o2.total_amount = 500 * 215.0

        # Order 3: Store 1, 20 days ago (Delivered)
        o3 = Order(business_id=biz_id, store_id=store1.id, client_id=client1.id, status=OrderStatus.DELIVERED, notes="Suministro regular", source_type=DataSourceType.MANUAL, is_verified=True, delivery_date=(now - datetime.timedelta(days=18)).date(), payment_method="Transferencia", shipping_address=store1.address, created_at=now - datetime.timedelta(days=20))
        db.add(o3)
        await db.flush()
        oi4 = OrderItem(order_id=o3.id, product_id=prod1.id, quantity=450, unit_price=220.0)
        db.add(oi4)
        o3.total_amount = 450 * 220.0

        # Order 4: Store 1, 5 days ago (Confirmed)
        o4 = Order(business_id=biz_id, store_id=store1.id, client_id=client1.id, status=OrderStatus.CONFIRMED, notes="Incluye lote experimental de blanco", source_type=DataSourceType.MANUAL, is_verified=True, delivery_date=(now + datetime.timedelta(days=2)).date(), payment_method="Transferencia", shipping_address=store1.address, created_at=now - datetime.timedelta(days=5))
        db.add(o4)
        await db.flush()
        oi5 = OrderItem(order_id=o4.id, product_id=prod1.id, quantity=520, unit_price=215.0)
        oi6 = OrderItem(order_id=o4.id, product_id=prod3.id, quantity=50, unit_price=190.0)
        db.add_all([oi5, oi6])
        o4.total_amount = (520 * 215.0) + (50 * 190.0)

        # Order 5: Store 2, 45 days ago (Delivered)
        o5 = Order(business_id=biz_id, store_id=store2.id, client_id=client2.id, status=OrderStatus.DELIVERED, notes="Mortero y Cemento gris para CDMX", source_type=DataSourceType.MANUAL, is_verified=True, delivery_date=(now - datetime.timedelta(days=43)).date(), payment_method="Crédito 30d", shipping_address=store2.address, created_at=now - datetime.timedelta(days=45))
        db.add(o5)
        await db.flush()
        oi7 = OrderItem(order_id=o5.id, product_id=prod1.id, quantity=100, unit_price=220.0)
        oi8 = OrderItem(order_id=o5.id, product_id=prod4.id, quantity=200, unit_price=135.0)
        db.add_all([oi7, oi8])
        o5.total_amount = (100 * 220.0) + (200 * 135.0)

        # Order 6: Store 2, 25 days ago (Delivered)
        o6 = Order(business_id=biz_id, store_id=store2.id, client_id=client2.id, status=OrderStatus.DELIVERED, notes="Saco Blanco y Mortero", source_type=DataSourceType.MANUAL, is_verified=True, delivery_date=(now - datetime.timedelta(days=23)).date(), payment_method="Crédito 30d", shipping_address=store2.address, created_at=now - datetime.timedelta(days=25))
        db.add(o6)
        await db.flush()
        oi9 = OrderItem(order_id=o6.id, product_id=prod3.id, quantity=40, unit_price=190.0)
        oi10 = OrderItem(order_id=o6.id, product_id=prod4.id, quantity=150, unit_price=135.0)
        db.add_all([oi9, oi10])
        o6.total_amount = (40 * 190.0) + (150 * 135.0)

        # Order 7: Store 2, 10 days ago (Shipped)
        o7 = Order(business_id=biz_id, store_id=store2.id, client_id=client2.id, status=OrderStatus.SHIPPED, notes="Incluye aditivo impermeabilizante líquido", source_type=DataSourceType.MANUAL, is_verified=True, delivery_date=(now - datetime.timedelta(days=8)).date(), payment_method="Transferencia", shipping_address=store2.address, created_at=now - datetime.timedelta(days=10))
        db.add(o7)
        await db.flush()
        oi11 = OrderItem(order_id=o7.id, product_id=prod1.id, quantity=120, unit_price=220.0)
        oi12 = OrderItem(order_id=o7.id, product_id=prod5.id, quantity=5, unit_price=850.0)
        db.add_all([oi11, oi12])
        o7.total_amount = (120 * 220.0) + (5 * 850.0)

        # Order 8: Store 3, 40 days ago (Delivered)
        o8 = Order(business_id=biz_id, store_id=store3.id, client_id=client3.id, status=OrderStatus.DELIVERED, notes="Suministro de obra Mérida", source_type=DataSourceType.MANUAL, is_verified=True, delivery_date=(now - datetime.timedelta(days=38)).date(), payment_method="Transferencia", shipping_address=store3.address, created_at=now - datetime.timedelta(days=40))
        db.add(o8)
        await db.flush()
        oi13 = OrderItem(order_id=o8.id, product_id=prod1.id, quantity=600, unit_price=220.0)
        oi14 = OrderItem(order_id=o8.id, product_id=prod2.id, quantity=200, unit_price=245.0)
        db.add_all([oi13, oi14])
        o8.total_amount = (600 * 220.0) + (200 * 245.0)

        # Order 9: Store 3, 20 days ago (Delivered)
        o9 = Order(business_id=biz_id, store_id=store3.id, client_id=client3.id, status=OrderStatus.DELIVERED, notes="Aditivos para cimentación costera", source_type=DataSourceType.MANUAL, is_verified=True, delivery_date=(now - datetime.timedelta(days=18)).date(), payment_method="Transferencia", shipping_address=store3.address, created_at=now - datetime.timedelta(days=20))
        db.add(o9)
        await db.flush()
        oi15 = OrderItem(order_id=o9.id, product_id=prod2.id, quantity=400, unit_price=245.0)
        oi16 = OrderItem(order_id=o9.id, product_id=prod5.id, quantity=10, unit_price=850.0)
        db.add_all([oi15, oi16])
        o9.total_amount = (400 * 245.0) + (10 * 850.0)

        # Order 10: Store 3, 4 days ago (Delivered)
        o10 = Order(business_id=biz_id, store_id=store3.id, client_id=client3.id, status=OrderStatus.DELIVERED, notes="Resurtido urgente de cemento gris", source_type=DataSourceType.MANUAL, is_verified=True, delivery_date=(now - datetime.timedelta(days=2)).date(), payment_method="Transferencia", shipping_address=store3.address, created_at=now - datetime.timedelta(days=4))
        db.add(o10)
        await db.flush()
        oi17 = OrderItem(order_id=o10.id, product_id=prod1.id, quantity=500, unit_price=220.0)
        db.add(oi17)
        o10.total_amount = 500 * 220.0

        print("Orders seeded successfully.")

        # --- 6. SEED COMPETITORS ---
        print("Seeding Competitors...")
        comp1 = Competitor(business_id=biz_id, store_id=store1.id, name="CEMEX", presence_level="high", notes="Ofrecen condiciones muy agresivas y plazos de crédito de hasta 45 días en cemento gris.")
        comp2 = Competitor(business_id=biz_id, store_id=store2.id, name="Holcim", presence_level="medium", notes="Fuerte empuje publicitario y entregas gratuitas de cemento blanco en la delegación Tlalpan.")
        
        db.add_all([comp1, comp2])
        await db.flush()

        # --- 7. SEED CUSTOMER NOTES (B2B CRM Profile) ---
        print("Seeding Customer Notes...")
        cn1 = CustomerNote(business_id=biz_id, client_id=client1.id, comm_style="direct", visit_frequency="weekly", last_visit_date=(now - datetime.timedelta(days=5)).date(), next_visit_date=(now + datetime.timedelta(days=2)).date(), preferred_actions="Descuentos por volumen, visitas presenciales de seguimiento", general_notes="Mateo es un comprador enfocado en volumen y precio. Valora mucho el cumplimiento en tiempos de entrega porque su almacén tiene alta rotación.", note_type="commercial")
        cn2 = CustomerNote(business_id=biz_id, client_id=client2.id, comm_style="friendly", visit_frequency="monthly", last_visit_date=(now - datetime.timedelta(days=12)).date(), next_visit_date=(now + datetime.timedelta(days=15)).date(), preferred_actions="Campañas digitales conjuntas, material promocional para punto de venta", general_notes="Sofía prefiere comunicación por WhatsApp. Le interesan las campañas promocionales coordinadas y los artículos de marketing para sus vendedores de piso.", note_type="marketing")
        cn3 = CustomerNote(business_id=biz_id, client_id=client3.id, comm_style="formal", visit_frequency="monthly", last_visit_date=(now - datetime.timedelta(days=8)).date(), next_visit_date=(now + datetime.timedelta(days=22)).date(), preferred_actions="Fichas técnicas detalladas de aditivos y capacitación técnica en obra", general_notes="Carlos es ingeniero y se enfoca en especificaciones técnicas de los productos. Requiere fichas técnicas detalladas de aditivos impermeabilizantes.", note_type="general")

        db.add_all([cn1, cn2, cn3])
        await db.flush()

        # --- 8. SEED STORE NOTES (Observations - commercial, marketing, risks & opportunities) ---
        print("Seeding Store Notes (Field Observations)...")
        # Store 1 Observations
        sn1 = StoreNote(store_id=store1.id, note="Mateo solicita un descuento adicional del 3% en compras de cemento gris si superan los 500 sacos por pedido. Considera que el volumen lo justifica.", risks="", opportunities="", note_type="commercial", is_actionable=True, source_type=DataSourceType.MANUAL, is_verified=True, created_at=now - datetime.timedelta(days=45))
        sn2 = StoreNote(store_id=store1.id, note="Se colocó con éxito una lona de gran formato de Cemenquin en la entrada de la bodega de Materiales Rivera. Buena visibilidad desde la avenida.", risks="", opportunities="", note_type="marketing", is_actionable=False, source_type=DataSourceType.MANUAL, is_verified=True, created_at=now - datetime.timedelta(days=30))
        sn3 = StoreNote(store_id=store1.id, note="Mateo abrirá una nueva sucursal en San Pedro Garza García el próximo mes. Es una excelente oportunidad para ingresar toda nuestra gama de cemento blanco.", risks="", opportunities="Nueva sucursal en San Pedro Garza García", note_type="opportunity", is_actionable=True, source_type=DataSourceType.MANUAL, is_verified=True, created_at=now - datetime.timedelta(days=15))
        sn4 = StoreNote(store_id=store1.id, note="Representante de CEMEX visitó a Mateo Rivera ofreciendo plazo de crédito a 45 días (actualmente le damos 30 días). Si no igualamos o negociamos, podríamos perder el 20% del volumen.", risks="CEMEX ofrece 45 días de crédito", opportunities="", note_type="risk", is_actionable=True, source_type=DataSourceType.MANUAL, is_verified=True, created_at=now - datetime.timedelta(days=10))

        # Store 2 Observations
        sn5 = StoreNote(store_id=store2.id, note="Sofía Ortiz solicita cotización formal de Mortero Seco para un desarrollo habitacional en la zona poniente. Estima un consumo de 200 sacos mensuales.", risks="", opportunities="", note_type="commercial", is_actionable=True, source_type=DataSourceType.MANUAL, is_verified=True, created_at=now - datetime.timedelta(days=50))
        sn6 = StoreNote(store_id=store2.id, note="Se acordó entregar material publicitario como gorras y playeras de Cemenquin a los vendedores de piso para incentivar la venta del cemento blanco.", risks="", opportunities="", note_type="marketing", is_actionable=True, source_type=DataSourceType.MANUAL, is_verified=True, created_at=now - datetime.timedelta(days=25))
        sn7 = StoreNote(store_id=store2.id, note="Holcim empezó a ofrecer entregas gratis de cemento blanco en la alcaldía Tlalpan. Amenaza directa para nuestro margen en el Centro.", risks="Entregas bonificadas de Holcim", opportunities="", note_type="risk", is_actionable=True, source_type=DataSourceType.MANUAL, is_verified=True, created_at=now - datetime.timedelta(days=5))

        # Store 3 Observations
        sn8 = StoreNote(store_id=store3.id, note="Carlos reporta un retraso de 2 días en el último despacho de Monterrey. Afectó su planeación semanal de ensacado. Se acordó ajustar tiempos con transportista.", risks="", opportunities="", note_type="commercial", is_actionable=False, source_type=DataSourceType.MANUAL, is_verified=True, created_at=now - datetime.timedelta(days=40))
        sn9 = StoreNote(store_id=store3.id, note="Maya requiere cotizar aditivos impermeabilizantes líquidos de alta resistencia para un proyecto de cimentación en zona costera con alta salinidad.", risks="", opportunities="Proyecto costero de alta salinidad", note_type="opportunity", is_actionable=True, source_type=DataSourceType.MANUAL, is_verified=True, created_at=now - datetime.timedelta(days=20))

        db.add_all([sn1, sn2, sn3, sn4, sn5, sn6, sn7, sn8, sn9])
        await db.flush()
        print("Store Notes seeded.")

        # --- 9. SEED STORE ACTIONS ---
        print("Seeding Actions...")
        # Store 1 Actions
        sa1 = StoreAction(business_id=biz_id, store_id=store1.id, assigned_to_id=client1.id, template_id=t_comm.id, category=ActionCategory.COMMERCIAL, objective="INVENTORY_VELOCITY_OOS_PREVENTION", impact_level="high", note_source_id=sn1.id, status=ActionStatus.COMPLETED, details={"description": "Enviar propuesta de descuento por volumen a Mateo"}, resolution_notes="Se autorizó un 3% de descuento en compras mayores a 500 sacos. Mateo aceptó y firmó adenda de contrato comercial.", resolved_at=now - datetime.timedelta(days=40), result_value=Decimal("500.00"), result_unit="sacos", revenue_impact=Decimal("11000.00"), created_at=now - datetime.timedelta(days=44))
        sa2 = StoreAction(business_id=biz_id, store_id=store1.id, assigned_to_id=client1.id, template_id=t_mkt.id, category=ActionCategory.MARKETING, objective="TRADE_LOYALTY_VOLUME_PUSHING", impact_level="medium", note_source_id=sn2.id, status=ActionStatus.COMPLETED, details={"description": "Entrega y colocación de espectacular en Materiales Rivera"}, resolution_notes="Lona publicitaria instalada correctamente en fachada.", resolved_at=now - datetime.timedelta(days=28), result_value=Decimal("1.00"), result_unit="lona", revenue_impact=Decimal("0.00"), created_at=now - datetime.timedelta(days=29))
        sa3 = StoreAction(business_id=biz_id, store_id=store1.id, assigned_to_id=client1.id, category=ActionCategory.COMMERCIAL, objective="THREAT_RESPONSE", impact_level="high", note_source_id=sn4.id, status=ActionStatus.PENDING, details={"description": "Negociar plazo de crédito o descuento compensatorio ante oferta de CEMEX"}, due_date=now + datetime.timedelta(days=3), created_at=now - datetime.timedelta(days=9))

        # Store 2 Actions
        sa4 = StoreAction(business_id=biz_id, store_id=store2.id, assigned_to_id=client2.id, template_id=t_comm.id, category=ActionCategory.COMMERCIAL, objective="INVENTORY_VELOCITY_OOS_PREVENTION", impact_level="high", note_source_id=sn5.id, status=ActionStatus.COMPLETED, details={"description": "Cotización formal de 200 sacos de Mortero Seco para Sofía Ortiz"}, resolution_notes="Cotización enviada y aceptada. Se generó el pedido de Mortero.", resolved_at=now - datetime.timedelta(days=48), result_value=Decimal("200.00"), result_unit="sacos", revenue_impact=Decimal("27000.00"), created_at=now - datetime.timedelta(days=49))
        sa5 = StoreAction(business_id=biz_id, store_id=store2.id, assigned_to_id=client2.id, template_id=t_mkt.id, category=ActionCategory.MARKETING, objective="TRADE_LOYALTY_VOLUME_PUSHING", impact_level="low", note_source_id=sn6.id, status=ActionStatus.COMPLETED, details={"description": "Entrega de gorras y catálogos promocionales para vendedores de piso"}, resolution_notes="Material entregado a Sofía Ortiz para distribución.", resolved_at=now - datetime.timedelta(days=22), result_value=Decimal("25.00"), result_unit="piezas", revenue_impact=Decimal("0.00"), created_at=now - datetime.timedelta(days=24))
        sa6 = StoreAction(business_id=biz_id, store_id=store2.id, assigned_to_id=client2.id, category=ActionCategory.COMMERCIAL, objective="THREAT_RESPONSE", impact_level="high", note_source_id=sn7.id, status=ActionStatus.PENDING, details={"description": "Analizar costos logísticos en Centro para competir contra entregas bonificadas de Holcim"}, due_date=now + datetime.timedelta(days=5), created_at=now - datetime.timedelta(days=4))

        # Store 3 Actions
        sa7 = StoreAction(business_id=biz_id, store_id=store3.id, assigned_to_id=client3.id, category=ActionCategory.COMMERCIAL, objective="NEW_PRODUCT_INTRODUCTION", impact_level="medium", note_source_id=sn9.id, status=ActionStatus.PENDING, details={"description": "Cotizar aditivos impermeabilizantes para cimentación costera"}, due_date=now + datetime.timedelta(days=2), created_at=now - datetime.timedelta(days=19))

        db.add_all([sa1, sa2, sa3, sa4, sa5, sa6, sa7])
        await db.flush()
        print("Store Actions seeded.")

        # --- 10. SEED CONVERSATIONS & MESSAGES (Twilio Sandbox Simulator Logs) ---
        print("Seeding Conversation History...")
        # Conversation with Mateo Rivera
        c1 = Conversation(business_id=biz_id, client_id=client1.id, platform="whatsapp", platform_chat_id=client1.phone, is_active=True, ai_enabled=True, created_at=now - datetime.timedelta(days=50))
        db.add(c1)
        await db.flush()
        m1_1 = Message(conversation_id=c1.id, role="user", content="Hola, me gustaría saber si tienen precio especial para 500 sacos de cemento gris.", created_at=now - datetime.timedelta(days=50))
        m1_2 = Message(conversation_id=c1.id, role="assistant", content="Hola Mateo! Sí, por supuesto. Con gusto gestiono la propuesta con nuestro equipo comercial para ofrecerte un precio especial por volumen de 500 sacos de Cemento Gris CPC 30 R.", created_at=now - datetime.timedelta(days=50))
        m1_3 = Message(conversation_id=c1.id, role="user", content="Hola, ya recibí la cotización con el 3% de descuento, muchas gracias. Vamos a programar el primer pedido para la próxima semana.", created_at=now - datetime.timedelta(days=45))
        m1_4 = Message(conversation_id=c1.id, role="assistant", content="Excelente, Mateo. Ya registré el pedido y coordiné el despacho con logística para entregarlo en tu sucursal Rivera del Norte. Quedamos a tu servicio!", created_at=now - datetime.timedelta(days=45))
        db.add_all([m1_1, m1_2, m1_3, m1_4])
        
        # Conversation with Sofía Ortiz
        c2 = Conversation(business_id=biz_id, client_id=client2.id, platform="whatsapp", platform_chat_id=client2.phone, is_active=True, ai_enabled=True, created_at=now - datetime.timedelta(days=20))
        db.add(c2)
        await db.flush()
        m2_1 = Message(conversation_id=c2.id, role="user", content="Buenos días, quería preguntar si tienen disponible aditivo impermeabilizante líquido.", created_at=now - datetime.timedelta(days=20))
        m2_2 = Message(conversation_id=c2.id, role="assistant", content="Hola Sofía, muy buenos días. Sí, tenemos el Aditivo Impermeabilizante Líquido Cemenquin en garrafas de 19 litros. ¿Cuántas unidades necesitas cotizar?", created_at=now - datetime.timedelta(days=20))
        m2_3 = Message(conversation_id=c2.id, role="user", content="Necesito 5 garrafas por ahora.", created_at=now - datetime.timedelta(days=19))
        m2_4 = Message(conversation_id=c2.id, role="assistant", content="Perfecto. Te confirmo que el costo unitario es de $850. El total por 5 garrafas es de $4,250. ¿Deseas que programemos el envío junto a tu próximo pedido?", created_at=now - datetime.timedelta(days=19))
        m2_5 = Message(conversation_id=c2.id, role="user", content="Sí, por favor. Envíalas con el pedido normal de cemento de la próxima semana.", created_at=now - datetime.timedelta(days=18))
        db.add_all([m2_1, m2_2, m2_3, m2_4, m2_5])

        await db.commit()
        print("Historical Conversations and Messages seeded.")

        # --- 11. VECTOR CORPUS BACKFILL (Syncing Knowledge Base) ---
        print("🚀 Executing Knowledge Corpus Sync (Backfill)...")
        embedder = EmbeddingService(db)
        
        targets = [
            (KnowledgeEntityType.STORE, Store, [selectinload(Store.clients)]),
            (KnowledgeEntityType.CLIENT, Client, [selectinload(Client.trade_notes), selectinload(Client.stores)]),
            (KnowledgeEntityType.STORE_NOTE, StoreNote, [selectinload(StoreNote.store)]),
            (KnowledgeEntityType.CUSTOMER_NOTE, CustomerNote, [selectinload(CustomerNote.client).selectinload(Client.stores)]),
            (KnowledgeEntityType.COMPETITOR, Competitor, [selectinload(Competitor.store)])
        ]
        
        total_created = 0
        for entity_type, model, options in targets:
            stmt = select(model).where(model.business_id == biz_id) if hasattr(model, "business_id") else select(model).join(Store).where(Store.business_id == biz_id)
            if options:
                stmt = stmt.options(*options)
            
            res = await db.execute(stmt)
            entities = res.scalars().all()
            print(f"Syncing {len(entities)} entries of {entity_type} to KnowledgeCorpus...")
            
            for entity in entities:
                try:
                    content = entity.get_semantic_summary()
                    if not content or len(content.strip()) < 5:
                        continue
                    
                    metadata = {}
                    if hasattr(entity, "get_knowledge_metadata"):
                        metadata = entity.get_knowledge_metadata()
                        
                    # Generate Mock or Real embedding
                    embedding = getattr(entity, "embedding", None)
                    if embedding is None:
                        try:
                            embedding = await embedder.get_embedding(content)
                        except Exception as e:
                            # Fallback mock embedding if litellm/OpenAI fails during tests
                            print(f"Warning: OpenAI embedding fail, using mock vector: {e}")
                            embedding = [0.1] * 1536
                            
                    corpus_id = KnowledgeCorpus.generate_id(entity_type, entity.id)
                    
                    corpus_entry = KnowledgeCorpus(
                        id=corpus_id,
                        business_id=biz_id,
                        entity_type=entity_type,
                        entity_id=entity.id,
                        content=content,
                        embedding=embedding,
                        metadata_json=metadata
                    )
                    db.add(corpus_entry)
                    total_created += 1
                except Exception as ex:
                    print(f"Error syncing {entity_type} {entity.id}: {ex}")
                    
        await db.commit()
        print(f"Knowledge Corpus Sync complete! Created {total_created} vector search records.")

        # --- 12. LANGGRAPH CHECKPOINTER LIVE SIMULATION ---
        print("🚀 Invoking LangGraph Live Sessions to generate real checkpoints...")
        
        # 12.1 Sales Rep / B2B Client Flow (using AIService)
        try:
            print("Simulating a conversation turn with Mateo Rivera...")
            # We fetch biz with agents loaded to prevent greenlet/lazy load error
            res_biz_ref = await db.execute(
                select(BusinessProfile)
                .options(selectinload(BusinessProfile.agents))
                .where(BusinessProfile.id == biz_id)
            )
            biz_ref = res_biz_ref.scalars().first()
            ai = AIService(biz_ref, db)
            
            # Call live response generation
            resp = await ai.get_response(
                identifier=client1.phone,
                user_message="Hola, ¿me confirmas si el pedido de 520 sacos de cemento gris ya fue despachado?",
                metadata={"platform": "whatsapp", "name": "Mateo Rivera"}
            )
            print(f"Mateo response: {resp}")
        except Exception as e:
            print(f"Warning: Could not populate live LangGraph checkpoint for Mateo Rivera: {e}")
            import traceback
            traceback.print_exc()

        # 12.2 Prospect Qualifier Flow (using ProspectQualifier)
        try:
            print("Simulating a conversation turn with Juan Carlos Gómez (Prospect)...")
            qualifier = ProspectQualifier(db)
            resp, is_comp = await qualifier.get_response(
                business_id=biz_id,
                sender_phone=client_prospect.phone,
                user_message="Hola, soy Juan Carlos de Distribuidora del Centro en Puebla. Me interesa cotizar 150 sacos de Cemento Blanco Especial."
            )
            print(f"Prospect response: {resp} (Is Completed: {is_comp})")
        except Exception as e:
            print(f"Warning: Could not populate live LangGraph checkpoint for Prospect: {e}")

        await db.commit()
        print("🎉 Seeding and LangGraph simulation finished successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
