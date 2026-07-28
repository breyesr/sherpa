import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy import text
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")

from app.core.database import SessionLocal
from app.models.business import BusinessProfile
from app.models.trade import Store, Product
from app.services.prospect_qualifier import ProspectQualifier

async def run():
    biz_id = "06a3ac9d-26a9-78dc-8000-98268a466415"
    sender_phone = "whatsapp:+1234567890"
    thread_id = f"prospect_{sender_phone}"
    
    async with SessionLocal() as db:
        # First, clean up checkpointer and conversation for this user to start fresh
        await db.execute(text("DELETE FROM checkpoints WHERE thread_id = :tid"), {"tid": thread_id})
        await db.execute(text("DELETE FROM checkpoint_writes WHERE thread_id = :tid"), {"tid": thread_id})
        
        # Also clean up client/conversation/messages to prevent duplicates/conflicts
        # Client hash
        from app.models.crm import Client
        from app.models.messaging import Conversation
        client_hash = Client.hash_id(sender_phone)
        res_cli = await db.execute(select(Client).where(Client.business_id == biz_id, Client.whatsapp_id_hash == client_hash))
        client = res_cli.scalars().first()
        if client:
            res_conv = await db.execute(select(Conversation).where(Conversation.client_id == client.id))
            conv = res_conv.scalars().first()
            if conv:
                await db.execute(text("DELETE FROM messages WHERE conversation_id = :cid"), {"cid": conv.id})
                await db.delete(conv)
            await db.delete(client)
        
        await db.commit()
        
        qualifier = ProspectQualifier(db)
        
        turns = [
            "Hola buenas tardes, necesito 150 sacos de cemento gris",
            "Cemento Gris CPC 40 (Saco 50kg), 150 sacos",
            "Av. Carretera 234, Tlaquepaque Centro, Tlaquepaque, Guadalajara, CP 45500, Jalisco"
        ]
        
        uri = qualifier._get_pool_uri()
        
        async with AsyncConnectionPool(uri, kwargs={"autocommit": True}) as pool:
            checkpointer = AsyncPostgresSaver(pool)
            await checkpointer.setup()
            
            for i, turn in enumerate(turns, 1):
                print(f"\n--- TURN {i}: {turn} ---")
                response, is_completed = await qualifier.get_response(biz_id, sender_phone, turn)
                print(f"Agent response: {response}")
                print(f"Is completed: {is_completed}")
                
                # Fetch product list to setup graph state
                stmt = select(Product).join(Product.category).where(Product.category.has(business_id=biz_id))
                products = (await db.execute(stmt)).scalars().all()
                product_list_str = "\n".join([f"- ID: {p.id}, Nombre: {p.name}" for p in products])
                
                app = await qualifier._setup_graph(biz_id, product_list_str, checkpointer)
                config = {"configurable": {"thread_id": thread_id}}
                checkpoint_state = await app.aget_state(config)
                print(f"Current State values in checkpointer:")
                for k, v in checkpoint_state.values.items():
                    if k != "messages":
                        print(f"  {k}: {v}")

if __name__ == "__main__":
    asyncio.run(run())
