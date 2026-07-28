import asyncio
from sqlalchemy.future import select
from app.core.database import SessionLocal
from app.models.crm import Client
from app.models.trade import Store, Order, OrderItem, store_clients, ClientStoreHistory, StoreNote
from app.models.messaging import Conversation, Message

async def run():
    async with SessionLocal() as db:
        # Match the exact business ID prefix in the database
        business_id = "06a400f5-164c-7cdd-8000-55727144c135"
        
        # 1. Find Client
        res_clients = await db.execute(
            select(Client).where(Client.name.like("%Jorge%"), Client.business_id == business_id)
        )
        clients = res_clients.scalars().all()
        if not clients:
            print(f"No clients found matching 'Jorge' under business '{business_id}'")
            return
            
        print(f"Found {len(clients)} clients matching 'Jorge':")
        for c in clients:
            print(f"- Client: ID={c.id}, Name='{c.name}', Phone={c.phone}, Email={c.email}, is_prospect={c.is_prospect}")
            
            # Find linked stores
            res_stores = await db.execute(
                select(Store).join(store_clients).where(store_clients.c.client_id == c.id)
            )
            stores = res_stores.scalars().all()
            
            # Let's also look for stores where phone/email matches client's or has name containing "Jorge"
            res_stores_name = await db.execute(
                select(Store).where(Store.business_id == business_id, Store.name.like("%Jorge%"))
            )
            stores_name = res_stores_name.scalars().all()
            
            # Merge lists
            all_stores = {s.id: s for s in stores + stores_name}.values()
            print(f"  Linked/matching Stores ({len(all_stores)}):")
            for s in all_stores:
                print(f"    * Store: ID={s.id}, Name='{s.name}', Address={s.street_address}, is_prospect={s.is_prospect}")
                
                # Find StoreNotes
                res_notes = await db.execute(select(StoreNote).where(StoreNote.store_id == s.id))
                notes = res_notes.scalars().all()
                print(f"      StoreNotes: {len(notes)}")
                for n in notes:
                    await db.delete(n)
                
                # Find Orders
                res_orders = await db.execute(select(Order).where(Order.store_id == s.id))
                orders = res_orders.scalars().all()
                print(f"      Orders: {len(orders)}")
                for o in orders:
                    # Find OrderItems
                    res_items = await db.execute(select(OrderItem).where(OrderItem.order_id == o.id))
                    items = res_items.scalars().all()
                    for it in items:
                        await db.delete(it)
                    await db.delete(o)
                
                # Delete store history
                res_hist = await db.execute(select(ClientStoreHistory).where((ClientStoreHistory.old_store_id == s.id) | (ClientStoreHistory.new_store_id == s.id)))
                hists = res_hist.scalars().all()
                for h in hists:
                    await db.delete(h)
                
                # Delete store_clients link
                await db.execute(store_clients.delete().where(store_clients.c.store_id == s.id))
                
                # Delete the store itself
                await db.delete(s)
            
            # Find Conversations
            res_convs = await db.execute(
                select(Conversation).where(Conversation.client_id == c.id)
            )
            convs = res_convs.scalars().all()
            print(f"  Conversations ({len(convs)}):")
            for conv in convs:
                # Find Messages
                res_msgs = await db.execute(select(Message).where(Message.conversation_id == conv.id))
                msgs = res_msgs.scalars().all()
                print(f"    * Conv ID={conv.id} has {len(msgs)} messages")
                for m in msgs:
                    await db.delete(m)
                await db.delete(conv)
            
            # Delete Client Store Histories directly related to the client
            res_hist_c = await db.execute(select(ClientStoreHistory).where(ClientStoreHistory.client_id == c.id))
            hists_c = res_hist_c.scalars().all()
            for hc in hists_c:
                await db.delete(hc)
            
            # Delete client_stores link
            await db.execute(store_clients.delete().where(store_clients.c.client_id == c.id))
            
            # Delete the client itself
            await db.delete(c)
            print(f"  Successfully deleted client {c.name} and all related records.")
            
        await db.commit()
        print("Commit completed successfully.")

if __name__ == "__main__":
    asyncio.run(run())
