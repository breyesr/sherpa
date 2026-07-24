"""
Store & Postal Code CRUD sub-router.
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload

from app.core.database import get_db
from app.api.auth import get_current_user, require_feature, require_any_feature
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.trade import Store, StoreNote, PostalCode
from app.schemas.trade import (
    StoreResponse, StoreCreate, StoreUpdate,
    StoreNoteResponse, StoreNoteCreate,
    PostalCodeResponse
)

router = APIRouter()

async def get_business(db: AsyncSession, user_id: str) -> BusinessProfile:
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

@router.get("/postal-codes/lookup", response_model=List[PostalCodeResponse])
async def lookup_postal_code(
    zip_code: str = Query(..., min_length=5, max_length=5),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Lookup colonias, municipality, city, and state for a 5-digit Mexican postal code."""
    res = await db.execute(
        select(PostalCode).where(PostalCode.zip_code == zip_code).order_by(PostalCode.colonia)
    )
    results = res.scalars().all()
    if not results:
        raise HTTPException(status_code=404, detail="Postal code not found")
    return results

@router.get("/stores", response_model=List[StoreResponse], dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def list_stores(
    is_prospect: Optional[bool] = Query(default=False, description="Filter by prospect status."),
    assigned_store_id: Optional[str] = Query(default=None, description="Filter by assigned store ID."),
    prospect_segment: Optional[str] = Query(default=None, description="Filter by prospect segment."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all stores for the current business."""
    business = await get_business(db, current_user.id)
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
    """Create a new store for the business."""
    business = await get_business(db, current_user.id)
    store = Store(**store_in.model_dump(exclude={"client_ids"}), business_id=business.id)
    
    if store_in.client_ids:
        from app.models.crm import Client
        res_clients = await db.execute(select(Client).where(Client.id.in_(store_in.client_ids)))
        store.clients = res_clients.scalars().all()

    db.add(store)
    await db.commit()
    await db.refresh(store)
    
    from app.tasks.knowledge import sync_vector_task
    sync_vector_task.delay(store.id, "store", business.id)
    return store

@router.get("/stores/{store_id}", response_model=StoreResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def get_store(
    store_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get store details."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(Store)
        .where(Store.id == store_id, Store.business_id == business.id)
        .options(selectinload(Store.notes), selectinload(Store.clients))
    )
    store = result.scalars().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store

@router.patch("/stores/{store_id}", response_model=StoreResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def update_store(
    store_id: str,
    store_in: StoreUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update store details."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(Store)
        .where(Store.id == store_id, Store.business_id == business.id)
        .options(selectinload(Store.notes), selectinload(Store.clients))
    )
    store = result.scalars().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    update_data = store_in.model_dump(exclude_unset=True, exclude={"client_ids"})
    for field, value in update_data.items():
        setattr(store, field, value)
        
    if store_in.client_ids is not None:
        from app.models.crm import Client
        res_clients = await db.execute(select(Client).where(Client.id.in_(store_in.client_ids)))
        store.clients = res_clients.scalars().all()

    db.add(store)
    await db.commit()
    await db.refresh(store)
    
    from app.tasks.knowledge import sync_vector_task
    sync_vector_task.delay(store.id, "store", business.id)
    return store

@router.delete("/stores/{store_id}", dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def delete_store(
    store_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete a store."""
    from sqlalchemy import delete as sqldelete
    from app.models.trade import Order, OrderItem, Competitor, StoreAction, AccountIntelligence
    
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(Store)
        .where(Store.id == store_id, Store.business_id == business.id)
    )
    store = result.scalars().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    res_orders = await db.execute(select(Order.id).where(Order.store_id == store_id))
    order_ids = res_orders.scalars().all()
    if order_ids:
        await db.execute(sqldelete(OrderItem).where(OrderItem.order_id.in_(order_ids)))
        await db.execute(sqldelete(Order).where(Order.id.in_(order_ids)))
        
    res_notes = await db.execute(select(StoreNote.id).where(StoreNote.store_id == store_id))
    note_ids = res_notes.scalars().all()
    
    res_competitors = await db.execute(select(Competitor.id).where(Competitor.store_id == store_id))
    competitor_ids = res_competitors.scalars().all()

    await db.execute(sqldelete(StoreNote).where(StoreNote.store_id == store_id))
    await db.execute(sqldelete(Competitor).where(Competitor.store_id == store_id))
    await db.execute(sqldelete(StoreAction).where(StoreAction.store_id == store_id))
    await db.execute(sqldelete(AccountIntelligence).where(AccountIntelligence.store_id == store_id))
    
    from app.models.crm import Client
    res_clients = await db.execute(
        select(Client)
        .where(
            Client.business_id == business.id,
            Client.is_prospect == True
        )
    )
    for c in res_clients.scalars().all():
        if len(c.stores) == 1 and c.stores[0].id == store_id:
            await db.delete(c)

    await db.delete(store)
    await db.commit()
    
    delete_vector_task.delay(store_id, "store", business.id)
    for n_id in note_ids:
        delete_vector_task.delay(n_id, "store_note", business.id)
    for comp_id in competitor_ids:
        delete_vector_task.delay(comp_id, "competitor", business.id)
        
    return {"status": "deleted"}

@router.get("/stores/{store_id}/notes", response_model=List[StoreNoteResponse], dependencies=[Depends(require_feature("sales_intelligence"))])
async def list_store_notes(
    store_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all notes for a specific store."""
    business = await get_business(db, current_user.id)
    res_store = await db.execute(select(Store).where(Store.id == store_id, Store.business_id == business.id))
    if not res_store.scalars().first():
        raise HTTPException(status_code=404, detail="Store not found")
        
    res_notes = await db.execute(
        select(StoreNote).where(StoreNote.store_id == store_id).order_by(StoreNote.created_at.desc())
    )
    return res_notes.scalars().all()

@router.post("/stores/{store_id}/notes", response_model=StoreNoteResponse, dependencies=[Depends(require_feature("sales_intelligence"))])
async def create_store_note(
    store_id: str,
    note_in: StoreNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new note for a store."""
    business = await get_business(db, current_user.id)
    res_store = await db.execute(select(Store).where(Store.id == store_id, Store.business_id == business.id))
    if not res_store.scalars().first():
        raise HTTPException(status_code=404, detail="Store not found")

    note = StoreNote(**note_in.model_dump(), store_id=store_id, author_id=current_user.id)
    db.add(note)
    await db.commit()
    await db.refresh(note)

    from app.tasks.knowledge import sync_vector_task
    sync_vector_task.delay(note.id, "store_note", business.id)
    return note

from app.tasks.knowledge import delete_vector_task, sync_vector_task
