from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.auth import get_current_user, require_feature, require_any_feature
from app.core.ai_service import AIService
from app.services.graphrag import GraphRAGService
from app.models.user import User
from app.models.trade import Store, StoreNote, Competitor, PostalCode

from app.schemas.trade import (
    StoreResponse, StoreCreate, StoreUpdate,
    StoreNoteResponse, StoreNoteCreate,
    PostalCodeResponse, CompetitorResponse, CompetitorCreate
)

router = APIRouter()

# --- STORES ---

@router.get("/stores", response_model=List[StoreResponse], dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def list_stores(
    is_prospect: Optional[bool] = Query(default=False, description="Filter by prospect status. If None, returns all."),
    assigned_store_id: Optional[str] = Query(default=None, description="Filter by assigned store ID."),
    prospect_segment: Optional[str] = Query(default=None, description="Filter by prospect segment."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all stores for the current business."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    query = select(Store).where(Store.business_id == business.id)
    if is_prospect is not None:
        query = query.where(Store.is_prospect == is_prospect)
    if assigned_store_id is not None:
        query = query.where(Store.assigned_store_id == assigned_store_id)
    if prospect_segment is not None:
        query = query.where(Store.prospect_segment == prospect_segment)
        
    result = await db.execute(
        query.options(
            selectinload(Store.notes),
            selectinload(Store.clients)
        )
    )
    return result.scalars().all()

@router.post("/stores", response_model=StoreResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def create_store(
    store_in: StoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new store."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    
    # 1. Multi-tenant constraints validation
    if store_in.assigned_store_id:
        res_assigned = await db.execute(
            select(Store).where(Store.id == store_in.assigned_store_id, Store.business_id == business.id)
        )
        if not res_assigned.scalars().first():
            raise HTTPException(status_code=400, detail="Invalid assigned store ID for this business")
            
    if store_in.requested_product_id:
        from app.models.trade import Product, Category
        res_product = await db.execute(
            select(Product)
            .join(Category)
            .where(Product.id == store_in.requested_product_id, Category.business_id == business.id)
        )
        if not res_product.scalars().first():
            raise HTTPException(status_code=400, detail="Invalid product ID for this business")

    store = Store(
        business_id=business.id, 
        name=store_in.name,
        street_address=store_in.street_address,
        colonia=store_in.colonia,
        municipality=store_in.municipality,
        city=store_in.city,
        state=store_in.state,
        zip_code=store_in.zip_code,
        country=store_in.country or "México",
        phone=store_in.phone,
        email=store_in.email,
        market=store_in.market,
        segment=store_in.segment,
        region=store_in.region,
        opening_date=store_in.opening_date,
        external_id=store_in.external_id,
        is_prospect=store_in.is_prospect,
        delivery_zip_codes=store_in.delivery_zip_codes,
        assigned_store_id=store_in.assigned_store_id,
        requested_product_id=store_in.requested_product_id,
        requested_quantity=store_in.requested_quantity,
        potential_value=store_in.potential_value,
        referred_at=store_in.referred_at
    )
    
    # Handle multiple client_ids
    if store_in.client_ids:
        from app.models.crm import Client
        res_clients = await db.execute(
            select(Client).where(Client.id.in_(store_in.client_ids), Client.business_id == business.id)
        )
        valid_clients = res_clients.scalars().all()
        if len(valid_clients) != len(store_in.client_ids):
            raise HTTPException(status_code=400, detail="One or more invalid client IDs for this business")
        store.clients = valid_clients
        
        # Log initial store assignment to history
        from app.models.trade import ClientStoreHistory
        for client in valid_clients:
            history = ClientStoreHistory(
                client_id=client.id,
                new_store_id=store.id,
                changed_by_id=current_user.id
            )
            db.add(history)

    db.add(store)
    await db.commit()
    trade.sync_vector_task.delay(str(store.id), "store", str(business.id))
    
    # Reload with relationships for the response
    result = await db.execute(
        select(Store)
        .where(Store.id == store.id)
        .options(selectinload(Store.notes), selectinload(Store.clients))
    )
    return result.scalars().first()

@router.get("/stores/{store_id}", response_model=StoreResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def get_store(
    store_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Fetch a single store with its notes."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    result = await db.execute(
        select(Store)
        .where(Store.id == store_id, Store.business_id == business.id)
        .options(
            selectinload(Store.notes),
            selectinload(Store.clients)
        )
    )
    store = result.scalars().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store

@router.post("/stores/{store_id}/notes", response_model=StoreNoteResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def create_store_note(
    store_id: str,
    note_in: StoreNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Add a note (observation) to a store."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    # Verify store belongs to business
    res_store = await db.execute(select(Store).where(Store.id == store_id, Store.business_id == business.id))
    if not res_store.scalars().first():
        raise HTTPException(status_code=404, detail="Store not found")
        
    note = StoreNote(
        store_id=store_id,
        author_id=current_user.id,
        **note_in.model_dump()
    )
    db.add(note)
    await db.commit()
    trade.sync_vector_task.delay(str(note.id), "store_note", str(business.id))
    await db.refresh(note)
    return note

@router.patch("/stores/{store_id}", response_model=StoreResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def update_store(
    store_id: str,
    store_in: StoreUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update a store."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    result = await db.execute(
        select(Store)
        .where(Store.id == store_id, Store.business_id == business.id)
        .options(selectinload(Store.notes), selectinload(Store.clients))
    )
    store = result.scalars().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    # Sanitize empty strings
    if store_in.assigned_store_id == "":
        store_in.assigned_store_id = None
    if store_in.requested_product_id == "":
        store_in.requested_product_id = None

    # Multi-tenant and circular reference checks
    if store_in.assigned_store_id:
        if store_in.assigned_store_id == store_id:
            raise HTTPException(status_code=400, detail="A store cannot be assigned to itself")
        res_assigned = await db.execute(
            select(Store).where(Store.id == store_in.assigned_store_id, Store.business_id == business.id)
        )
        if not res_assigned.scalars().first():
            raise HTTPException(status_code=400, detail="Invalid assigned store ID for this business")
            
    if store_in.requested_product_id:
        from app.models.trade import Product, Category
        res_product = await db.execute(
            select(Product)
            .join(Category)
            .where(Product.id == store_in.requested_product_id, Category.business_id == business.id)
        )
        if not res_product.scalars().first():
            raise HTTPException(status_code=400, detail="Invalid product ID for this business")
    
    # Handle multiple client_ids
    if store_in.client_ids is not None:
        from app.models.crm import Client
        from app.models.trade import ClientStoreHistory
        
        # Get currently associated clients to compute diffs
        old_client_ids = {c.id for c in store.clients}
        new_client_ids = set(store_in.client_ids)
        
        added_ids = new_client_ids - old_client_ids
        removed_ids = old_client_ids - new_client_ids
        
        if not store_in.client_ids:
            store.clients = []
        else:
            res_clients = await db.execute(
                select(Client).where(Client.id.in_(store_in.client_ids), Client.business_id == business.id)
            )
            valid_clients = res_clients.scalars().all()
            if len(valid_clients) != len(store_in.client_ids):
                raise HTTPException(status_code=400, detail="One or more invalid client IDs for this business")
            store.clients = valid_clients

        # Log additions and removals
        for cid in added_ids:
            history = ClientStoreHistory(
                client_id=cid,
                new_store_id=store.id,
                changed_by_id=current_user.id
            )
            db.add(history)
            
        for cid in removed_ids:
            history = ClientStoreHistory(
                client_id=cid,
                old_store_id=store.id,
                changed_by_id=current_user.id
            )
            db.add(history)

    update_data = store_in.model_dump(exclude_unset=True, exclude={"client_ids"})
    for field, value in update_data.items():
        setattr(store, field, value)
        
    # Automatically verify all unverified orders associated with this store when the store is verified
    if store_in.is_verified is True:
        from sqlalchemy import update as sql_update
        from app.models.trade import Order
        await db.execute(
            sql_update(Order)
            .where(Order.store_id == store.id, Order.is_verified == False)
            .values(is_verified=True)
        )
        
    db.add(store)
    await db.commit()
    trade.sync_vector_task.delay(str(store.id), "store", str(business.id))
    
    # Reload with relationships for the response
    res_final = await db.execute(
        select(Store)
        .where(Store.id == store.id)
        .options(selectinload(Store.notes), selectinload(Store.clients))
    )
    return res_final.scalars().first()

@router.delete("/stores/{store_id}", dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def delete_store(
    store_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete a store."""
    from sqlalchemy import delete as sqldelete
    from app.models.trade import StoreNote, Order, OrderItem, Competitor, StoreAction, AccountIntelligence, store_clients, CustomerNote
    import app.api.trade as trade
    
    business = await trade.get_business(db, current_user.id)
    result = await db.execute(
        select(Store)
        .where(Store.id == store_id, Store.business_id == business.id)
    )
    store = result.scalars().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    # 1. Delete order items and orders
    res_orders = await db.execute(select(Order.id).where(Order.store_id == store_id))
    order_ids = res_orders.scalars().all()
    if order_ids:
        await db.execute(sqldelete(OrderItem).where(OrderItem.order_id.in_(order_ids)))
        await db.execute(sqldelete(Order).where(Order.id.in_(order_ids)))
        
    # 2. Get related observation and competitor IDs before SQL delete
    res_notes = await db.execute(select(StoreNote.id).where(StoreNote.store_id == store_id))
    note_ids = res_notes.scalars().all()
    
    res_competitors = await db.execute(select(Competitor.id).where(Competitor.store_id == store_id))
    competitor_ids = res_competitors.scalars().all()

    # 3. Delete related observations and metadata
    await db.execute(sqldelete(StoreNote).where(StoreNote.store_id == store_id))
    await db.execute(sqldelete(Competitor).where(Competitor.store_id == store_id))
    await db.execute(sqldelete(StoreAction).where(StoreAction.store_id == store_id))
    await db.execute(sqldelete(AccountIntelligence).where(AccountIntelligence.store_id == store_id))
    
    # 4. Clean up prospect clients linked to this store (prevent leakage in chatbot sandbox)
    from app.models.crm import Client
    res_clients = await db.execute(
        select(Client)
        .join(store_clients, store_clients.c.client_id == Client.id)
        .where(store_clients.c.store_id == store_id)
    )
    linked_clients = res_clients.scalars().all()
    for client in linked_clients:
        if client.is_prospect:
            # Verify if this client is linked to any other store
            res_other = await db.execute(
                select(store_clients.c.store_id)
                .where(store_clients.c.client_id == client.id, store_clients.c.store_id != store_id)
            )
            other_stores = res_other.scalars().all()
            if not other_stores:
                # Clean customer notes vectors
                res_cn = await db.execute(
                    select(CustomerNote.id).where(CustomerNote.client_id == client.id)
                )
                cn_ids = res_cn.scalars().all()
                for cn_id in cn_ids:
                    trade.delete_vector_task.delay(str(cn_id), "customer_note", str(business.id))
                
                # Delete client vector
                trade.delete_vector_task.delay(str(client.id), "client", str(business.id))
                await db.delete(client)

    # 4.5. Clean link tables
    await db.execute(store_clients.delete().where(store_clients.c.store_id == store_id))
    
    # 5. Finally delete the store
    await db.delete(store)
    await db.commit()
    
    trade.delete_vector_task.delay(str(store_id), "store", str(business.id))
    for note_id in note_ids:
        trade.delete_vector_task.delay(str(note_id), "store_note", str(business.id))
    for comp_id in competitor_ids:
        trade.delete_vector_task.delay(str(comp_id), "competitor", str(business.id))
    return {"status": "deleted"}


# --- POSTAL CODES ---

@router.get("/postal-codes", response_model=List[PostalCodeResponse])
async def list_postal_codes(
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieve preloaded Mexican postal codes (limited for performance)."""
    result = await db.execute(select(PostalCode).limit(100))
    return result.scalars().all()


@router.get("/postal-codes/states", response_model=List[str])
async def list_states(
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieve all unique states."""
    result = await db.execute(select(PostalCode.state).distinct().order_by(PostalCode.state))
    return [r[0] for r in result.all()]


@router.get("/postal-codes/municipalities", response_model=List[str])
async def list_municipalities(
    state: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieve all unique municipalities for a given state."""
    result = await db.execute(
        select(PostalCode.municipality)
        .where(PostalCode.state == state)
        .distinct()
        .order_by(PostalCode.municipality)
    )
    return [r[0] for r in result.all()]


@router.get("/postal-codes/zip-codes", response_model=List[PostalCodeResponse])
async def list_zip_codes(
    state: str,
    municipality: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieve all zip codes and colonias for a given state and municipality."""
    result = await db.execute(
        select(PostalCode)
        .where(PostalCode.state == state, PostalCode.municipality == municipality)
        .order_by(PostalCode.zip_code)
    )
    return result.scalars().all()


@router.get("/postal-codes/{zip_code}", response_model=List[PostalCodeResponse])
async def lookup_postal_code(
    zip_code: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieve all matching colonias and geographical mappings for a 5-digit Mexican postal code."""
    result = await db.execute(
        select(PostalCode).where(PostalCode.zip_code == zip_code)
    )
    return result.scalars().all()


# --- COMPETITORS ---

@router.get("/competitors", response_model=List[CompetitorResponse], dependencies=[Depends(require_feature("b2b_solutions"))])
async def list_competitors(
    store_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all competitors, optionally filtered by store."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    query = select(Competitor).where(Competitor.business_id == business.id)
    
    if store_id:
        query = query.where(Competitor.store_id == store_id)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/competitors", response_model=CompetitorResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def create_competitor(
    competitor_in: CompetitorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Record a new competitor entry."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    
    # Verify store belongs to business
    store_res = await db.execute(
        select(Store).where(Store.id == competitor_in.store_id, Store.business_id == business.id)
    )
    if not store_res.scalars().first():
        raise HTTPException(status_code=400, detail="Invalid store ID")
        
    competitor = Competitor(
        business_id=business.id,
        **competitor_in.model_dump()
    )
    db.add(competitor)
    await db.commit()
    trade.sync_vector_task.delay(str(competitor.id), "competitor", str(business.id))
    await db.refresh(competitor)
    return competitor


# --- AI INSIGHTS / BRIEF ---

@router.get("/stores/{store_id}/brief", dependencies=[Depends(require_feature("sales_intelligence"))])
async def get_strategic_brief(
    store_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Generate a strategic pre-visit brief for a specific store using GraphRAG."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    # Verify store belongs to business
    res_store = await db.execute(select(Store).where(Store.id == store_id, Store.business_id == business.id))
    store = res_store.scalars().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    rag_service = GraphRAGService(db)
    # In B2B mode, we use the store name as the primary context for the brief
    brief = await rag_service.generate_brief(f"Brief for {store.name}", business.id)
    return {"report": brief}


@router.post("/clients/{client_id}/brief", dependencies=[Depends(require_feature("sales_intelligence"))])
async def generate_visit_brief(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Generate a specialized AI brief for a store visit."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    ai_service = AIService(business, db)
    report = await ai_service.get_specialized_response(client_id, "briefer")
    return {"report": report}


@router.post("/clients/{client_id}/qualify", dependencies=[Depends(require_feature("sales_intelligence"))])
async def qualify_lead(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Generate a lead qualification report for a retailer."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    ai_service = AIService(business, db)
    report = await ai_service.get_specialized_response(client_id, "qualifier")
    return {"report": report}
