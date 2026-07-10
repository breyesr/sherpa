from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload

from app.core.database import get_db
from app.api.auth import get_current_user, require_feature, require_any_feature
from app.core.ai_service import AIService
from app.services.graphrag import GraphRAGService
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.trade import Store, StoreNote, Category, Product, Order, OrderItem, Competitor, ActionTemplate, StoreAction, PostalCode, StoreActionObjective
from app.schemas.trade import (
    StoreResponse, StoreCreate, StoreUpdate,
    CategoryResponse, CategoryCreate,
    ProductResponse, ProductCreate, ProductUpdate,
    StoreNoteResponse, StoreNoteCreate,
    OrderResponse, OrderCreate, OrderUpdate,
    CompetitorResponse, CompetitorCreate,
    ActionTemplateCreate, ActionTemplateResponse, ActionTemplateUpdate,
    StoreActionCreate, StoreActionResponse, StoreActionUpdate,
    PostalCodeResponse, StoreActionObjectiveCreate, StoreActionObjectiveResponse
)

from app.tasks.knowledge import sync_vector_task, delete_vector_task

router = APIRouter(dependencies=[Depends(get_current_user)])

async def get_business(db: AsyncSession, user_id: str) -> BusinessProfile:
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

async def get_b2b_business(db: AsyncSession, current_user: User) -> BusinessProfile:
    from app.api.business import DEFAULT_FEATURES_CONFIG
    cfg = current_user.business_profile.features_config or DEFAULT_FEATURES_CONFIG
    if not cfg.get("b2b_solutions", {}).get("enabled", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="El módulo 'b2b_solutions' no está habilitado para esta cuenta."
        )
    return await get_business(db, current_user.id)

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
    """Create a new store."""
    business = await get_business(db, current_user.id)
    
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
    sync_vector_task.delay(str(store.id), "store", str(business.id))
    
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
    business = await get_business(db, current_user.id)
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
    business = await get_business(db, current_user.id)
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
    sync_vector_task.delay(str(note.id), "store_note", str(business.id))
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
    business = await get_business(db, current_user.id)
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
        
    db.add(store)
    await db.commit()
    sync_vector_task.delay(str(store.id), "store", str(business.id))
    
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
    from app.models.trade import StoreNote, Order, OrderItem, Competitor, StoreAction, AccountIntelligence, store_clients
    
    business = await get_business(db, current_user.id)
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
    
    # 4. Clean link tables
    await db.execute(store_clients.delete().where(store_clients.c.store_id == store_id))
    
    # 5. Finally delete the store
    await db.delete(store)
    await db.commit()
    
    delete_vector_task.delay(str(store_id), "store", str(business.id))
    for note_id in note_ids:
        delete_vector_task.delay(str(note_id), "store_note", str(business.id))
    for comp_id in competitor_ids:
        delete_vector_task.delay(str(comp_id), "competitor", str(business.id))
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


# --- CATEGORIES ---

@router.get("/categories", response_model=List[CategoryResponse], dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all product categories."""
    business = await get_business(db, current_user.id)
    result = await db.execute(select(Category).where(Category.business_id == business.id))
    return result.scalars().all()

@router.post("/categories", response_model=CategoryResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new category."""
    business = await get_business(db, current_user.id)
    category = Category(business_id=business.id, **category_in.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

# --- PRODUCTS ---

@router.get("/products", response_model=List[ProductResponse], dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def list_products(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all products in the catalog."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(Product)
        .join(Category)
        .where(Category.business_id == business.id)
    )
    return result.scalars().all()

@router.post("/products", response_model=ProductResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def create_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new product."""
    business = await get_business(db, current_user.id)
    # Verify category belongs to business
    cat_res = await db.execute(
        select(Category).where(Category.id == product_in.category_id, Category.business_id == business.id)
    )
    if not cat_res.scalars().first():
        raise HTTPException(status_code=400, detail="Invalid category ID")
        
    product = Product(**product_in.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product

@router.get("/products/{product_id}", response_model=ProductResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def get_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get a product by ID."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(Product)
        .join(Category)
        .where(Product.id == product_id, Category.business_id == business.id)
    )
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.patch("/products/{product_id}", response_model=ProductResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def update_product(
    product_id: str,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update a product."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(Product)
        .join(Category)
        .where(Product.id == product_id, Category.business_id == business.id)
    )
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    update_data = product_in.model_dump(exclude_unset=True)
    if "category_id" in update_data:
        cat_res = await db.execute(
            select(Category).where(Category.id == update_data["category_id"], Category.business_id == business.id)
        )
        if not cat_res.scalars().first():
            raise HTTPException(status_code=400, detail="Invalid category ID")
            
    for field, value in update_data.items():
        setattr(product, field, value)
        
    await db.commit()
    await db.refresh(product)
    return product

@router.delete("/products/{product_id}", dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete a product."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(Product)
        .join(Category)
        .where(Product.id == product_id, Category.business_id == business.id)
    )
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    await db.delete(product)
    await db.commit()
    return {"status": "success", "message": "Product deleted"}

# --- ORDERS ---

@router.get("/prospects/orders", response_model=List[OrderResponse], dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def list_prospect_orders(
    segment: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all prospecting/unverified orders for the business, partitioned by segment."""
    business = await get_business(db, current_user.id)
    query = (
        select(Order)
        .join(Store, Order.store_id == Store.id)
        .where(Order.business_id == business.id, Store.is_prospect == True)
        .options(selectinload(Order.items))
    )
    if segment:
        query = query.where(Store.prospect_segment == segment)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/orders", response_model=List[OrderResponse], dependencies=[Depends(require_feature("b2b_solutions"))])
async def list_orders(
    store_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all orders for the business, optionally filtered by store."""
    business = await get_business(db, current_user.id)
    query = select(Order).where(Order.business_id == business.id).options(selectinload(Order.items))
    
    if store_id:
        query = query.where(Order.store_id == store_id)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/orders", response_model=OrderResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def create_order(
    order_in: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new order with items."""
    business = await get_business(db, current_user.id)
    
    # Verify store belongs to business
    store_res = await db.execute(
        select(Store).where(Store.id == order_in.store_id, Store.business_id == business.id)
    )
    if not store_res.scalars().first():
        raise HTTPException(status_code=400, detail="Invalid store ID")
        
    order = Order(
        business_id=business.id,
        store_id=order_in.store_id,
        client_id=order_in.client_id,
        status=order_in.status,
        notes=order_in.notes,
        delivery_id=order_in.delivery_id,
        delivery_date=order_in.delivery_date,
        payment_method=order_in.payment_method,
        shipping_address=order_in.shipping_address
    )
    
    total_amount = 0.0
    for item_in in order_in.items:
        # Verify product exists
        prod_res = await db.execute(select(Product).where(Product.id == item_in.product_id))
        product = prod_res.scalars().first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item_in.product_id} not found")
            
        order_item = OrderItem(
            product_id=item_in.product_id,
            quantity=item_in.quantity,
            unit_price=item_in.unit_price
        )
        order.items.append(order_item)
        total_amount += (item_in.quantity * item_in.unit_price)
        
    order.total_amount = total_amount
    db.add(order)
    await db.commit()
    
    # Reload with items
    res_final = await db.execute(
        select(Order).where(Order.id == order.id).options(selectinload(Order.items))
    )
    return res_final.scalars().first()

@router.get("/orders/{order_id}", response_model=OrderResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def get_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get detail of a single order by ID."""
    business = await get_business(db, current_user.id)
    query = select(Order).where(
        Order.id == order_id, 
        Order.business_id == business.id
    ).options(selectinload(Order.items))
    result = await db.execute(query)
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.patch("/orders/{order_id}", response_model=OrderResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def update_order(
    order_id: str,
    order_in: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update order metadata or status."""
    business = await get_business(db, current_user.id)
    query = select(Order).where(
        Order.id == order_id, 
        Order.business_id == business.id
    ).options(selectinload(Order.items))
    result = await db.execute(query)
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Update fields dynamically
    update_data = order_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)
        
    db.add(order)
    await db.commit()
    
    # Reload with items
    res_final = await db.execute(
        select(Order).where(Order.id == order.id).options(selectinload(Order.items))
    )
    return res_final.scalars().first()

# --- COMPETITORS ---

@router.get("/competitors", response_model=List[CompetitorResponse], dependencies=[Depends(require_feature("b2b_solutions"))])
async def list_competitors(
    store_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all competitors, optionally filtered by store."""
    business = await get_business(db, current_user.id)
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
    business = await get_business(db, current_user.id)
    
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
    sync_vector_task.delay(str(competitor.id), "competitor", str(business.id))
    await db.refresh(competitor)
    return competitor

# --- AI INSIGHTS ---

@router.get("/stores/{store_id}/brief", dependencies=[Depends(require_feature("sales_intelligence"))])
async def get_strategic_brief(
    store_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Generate a strategic pre-visit brief for a specific store using GraphRAG."""
    business = await get_business(db, current_user.id)
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
    business = await get_business(db, current_user.id)
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
    business = await get_business(db, current_user.id)
    ai_service = AIService(business, db)
    report = await ai_service.get_specialized_response(client_id, "qualifier")
    return {"report": report}


# ==========================================
# --- ACTION TEMPLATE CATALOG ENDPOINTS ---
# ==========================================

from typing import Optional

@router.get("/action-templates", response_model=List[ActionTemplateResponse], dependencies=[Depends(require_feature("b2b_solutions"))])
async def list_action_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all action templates for the business."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(ActionTemplate)
        .where(ActionTemplate.business_id == business.id)
        .order_by(ActionTemplate.name.asc())
    )
    return result.scalars().all()

@router.post("/action-templates", response_model=ActionTemplateResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def create_action_template(
    template_in: ActionTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new action template."""
    business = await get_business(db, current_user.id)
    
    # Verify objective matches category if specified
    if template_in.objective:
        res_obj = await db.execute(
            select(StoreActionObjective).where(
                StoreActionObjective.business_id == business.id,
                StoreActionObjective.name == template_in.objective,
                StoreActionObjective.category == template_in.category
            )
        )
        if not res_obj.scalars().first():
            raise HTTPException(
                status_code=400,
                detail=f"Invalid objective '{template_in.objective}' for category '{template_in.category}'"
            )
            
    template = ActionTemplate(
        business_id=business.id,
        **template_in.model_dump()
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template

@router.patch("/action-templates/{template_id}", response_model=ActionTemplateResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def update_action_template(
    template_id: str,
    template_in: ActionTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update an action template."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(ActionTemplate)
        .where(ActionTemplate.id == template_id, ActionTemplate.business_id == business.id)
    )
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Action template not found")
        
    update_data = template_in.model_dump(exclude_unset=True)
    
    # Verify objective/category match if updated
    if "objective" in update_data or "category" in update_data:
        val_objective = update_data.get("objective") or template.objective
        val_category = update_data.get("category") or template.category
        if val_objective:
            res_obj = await db.execute(
                select(StoreActionObjective).where(
                    StoreActionObjective.business_id == business.id,
                    StoreActionObjective.name == val_objective,
                    StoreActionObjective.category == val_category
                )
            )
            if not res_obj.scalars().first():
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid objective '{val_objective}' for category '{val_category}'"
                )
                
    for field, value in update_data.items():
        setattr(template, field, value)
        
    await db.commit()
    await db.refresh(template)
    return template

@router.delete("/action-templates/{template_id}", dependencies=[Depends(require_feature("b2b_solutions"))])
async def delete_action_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete an action template."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(ActionTemplate)
        .where(ActionTemplate.id == template_id, ActionTemplate.business_id == business.id)
    )
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Action template not found")
        
    await db.delete(template)
    await db.commit()
    return {"status": "success", "message": "Action template deleted"}


# ==========================================
# --- STORE ACTIONS (STRATEGY DESK) ---
# ==========================================

@router.get("/actions", response_model=List[StoreActionResponse], dependencies=[Depends(require_feature("b2b_solutions"))])
async def list_store_actions(
    store_id: Optional[str] = None,
    assigned_to_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List store actions for the current business with filters."""
    business = await get_business(db, current_user.id)
    
    query = select(StoreAction).where(StoreAction.business_id == business.id)
    
    if store_id:
        query = query.where(StoreAction.store_id == store_id)
    if assigned_to_id:
        query = query.where(StoreAction.assigned_to_id == assigned_to_id)
    if status:
        query = query.where(StoreAction.status == status)
    if category:
        query = query.where(StoreAction.category == category)
        
    query = query.options(
        joinedload(StoreAction.store),
        joinedload(StoreAction.assigned_to),
        joinedload(StoreAction.template)
    ).order_by(StoreAction.created_at.desc()).offset(offset).limit(limit)
    
    res = await db.execute(query)
    actions = res.scalars().all()
    
    # Enrich response properties to eliminate client-side N+1 loops
    for action in actions:
        action.store_name = action.store.name if action.store else None
        action.assigned_to_name = action.assigned_to.name if action.assigned_to else None
        action.template_name = action.template.name if action.template else None
        
    return actions

@router.get("/actions/{action_id}", response_model=StoreActionResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def get_store_action(
    action_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve a single store action."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(StoreAction)
        .where(StoreAction.id == action_id, StoreAction.business_id == business.id)
        .options(
            joinedload(StoreAction.store),
            joinedload(StoreAction.assigned_to),
            joinedload(StoreAction.template)
        )
    )
    action = result.scalars().first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    action.store_name = action.store.name if action.store else None
    action.assigned_to_name = action.assigned_to.name if action.assigned_to else None
    action.template_name = action.template.name if action.template else None
    return action

@router.post("/actions", response_model=StoreActionResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def create_store_action(
    action_in: StoreActionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a manual store action."""
    business = await get_business(db, current_user.id)
    
    # Verify store belongs to this business
    res_store = await db.execute(select(Store).where(Store.id == action_in.store_id, Store.business_id == business.id))
    store = res_store.scalars().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    action_data = action_in.model_dump()
    
    # Sanitize empty-string FK fields sent by the frontend (dropdowns default to '')
    for fk_field in ("assigned_to_id", "template_id", "note_source_id"):
        if fk_field in action_data and action_data[fk_field] == "":
            action_data[fk_field] = None

    # Auto-assign fields from template if template_id is provided
    if action_data.get("template_id"):
        res_tpl = await db.execute(
            select(ActionTemplate)
            .where(ActionTemplate.id == action_data["template_id"], ActionTemplate.business_id == business.id)
        )
        template = res_tpl.scalars().first()
        if not template:
            raise HTTPException(status_code=400, detail="Invalid template ID")
        
        # Override properties from template blueprint
        action_data["category"] = template.category
        if template.objective:
            action_data["objective"] = template.objective
        action_data["result_unit"] = template.default_unit
        
        # Merge template's name & description into details JSONB
        details = action_data.get("details") or {}
        details["title"] = template.name
        details["description"] = template.description or ""
        action_data["details"] = details
        
    # Verify objective is valid for this business and matches the specified category
    res_obj = await db.execute(
        select(StoreActionObjective).where(
            StoreActionObjective.business_id == business.id,
            StoreActionObjective.name == action_data["objective"],
            StoreActionObjective.category == action_data["category"]
        )
    )
    if not res_obj.scalars().first():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid objective '{action_data['objective']}' for category '{action_data['category']}'"
        )
        
    # Validate SHARE_OF_SHELF percentage goals
    if action_data["objective"] == "SHARE_OF_SHELF" and action_data.get("details"):
        target_val = action_data["details"].get("target_value")
        if target_val is not None:
            try:
                val_float = float(target_val)
                if val_float < 1.0 or val_float > 100.0:
                    raise HTTPException(status_code=400, detail="Goal percentage must be between 1 and 100")
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="Invalid metric goal value")
            
    # Strip timezone info from datetime fields to prevent asyncpg DataError
    if action_data.get("due_date") and action_data["due_date"].tzinfo:
        action_data["due_date"] = action_data["due_date"].replace(tzinfo=None)
            
    action = StoreAction(
        business_id=business.id,
        author_id=current_user.id,
        **action_data
    )
    
    db.add(action)
    await db.commit()
    
    # Reload enriched action
    result = await db.execute(
        select(StoreAction)
        .where(StoreAction.id == action.id)
        .options(
            joinedload(StoreAction.store),
            joinedload(StoreAction.assigned_to),
            joinedload(StoreAction.template)
        )
    )
    enriched = result.scalars().first()
    enriched.store_name = enriched.store.name if enriched.store else None
    enriched.assigned_to_name = enriched.assigned_to.name if enriched.assigned_to else None
    enriched.template_name = enriched.template.name if enriched.template else None
    return enriched

@router.patch("/actions/{action_id}", response_model=StoreActionResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def update_store_action(
    action_id: str,
    action_in: StoreActionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update a store action, with strict validation on completion."""
    from app.models.trade import ActionStatus
    
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(StoreAction)
        .where(StoreAction.id == action_id, StoreAction.business_id == business.id)
        .options(
            joinedload(StoreAction.store),
            joinedload(StoreAction.assigned_to),
            joinedload(StoreAction.template)
        )
    )
    action = result.scalars().first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    update_data = action_in.model_dump(exclude_unset=True)
    
    # Verify objective and category alignment if updated
    if "objective" in update_data or "category" in update_data:
        val_objective = update_data.get("objective") or action.objective
        val_category = update_data.get("category") or action.category
        
        res_obj = await db.execute(
            select(StoreActionObjective).where(
                StoreActionObjective.business_id == business.id,
                StoreActionObjective.name == val_objective,
                StoreActionObjective.category == val_category
            )
        )
        if not res_obj.scalars().first():
            raise HTTPException(
                status_code=400,
                detail=f"Invalid objective '{val_objective}' for category '{val_category}'"
            )
            
    # Strip timezone info from datetime fields to prevent asyncpg DataError
    if update_data.get("due_date") and update_data["due_date"].tzinfo:
        update_data["due_date"] = update_data["due_date"].replace(tzinfo=None)
    
    # STRICT VALIDATION: Require result_value and resolution_notes to mark COMPLETED
    new_status = update_data.get("status")
    if new_status == ActionStatus.COMPLETED or (action.status == ActionStatus.COMPLETED and new_status is None):
        val = update_data.get("result_value") if "result_value" in update_data else action.result_value
        notes = update_data.get("resolution_notes") if "resolution_notes" in update_data else action.resolution_notes
        
        if val is None or not notes:
            raise HTTPException(
                status_code=400,
                detail="Strict Validation: A numeric result_value and resolution_notes are required to complete an action."
            )
        action.resolved_at = datetime.utcnow()
        
    for field, value in update_data.items():
        setattr(action, field, value)
        
    await db.commit()
    await db.refresh(action)
    
    action.store_name = action.store.name if action.store else None
    action.assigned_to_name = action.assigned_to.name if action.assigned_to else None
    action.template_name = action.template.name if action.template else None
    return action

@router.delete("/actions/{action_id}", dependencies=[Depends(require_feature("b2b_solutions"))])
async def delete_store_action(
    action_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete a store action."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(StoreAction)
        .where(StoreAction.id == action_id, StoreAction.business_id == business.id)
    )
    action = result.scalars().first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    await db.delete(action)
    await db.commit()
    return {"status": "success", "message": "Action deleted"}

@router.get("/objectives", response_model=List[StoreActionObjectiveResponse], dependencies=[Depends(require_feature("b2b_solutions"))])
async def list_objectives(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all dynamic action objectives for the business."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(StoreActionObjective)
        .where(StoreActionObjective.business_id == business.id)
        .order_by(StoreActionObjective.created_at.desc())
    )
    return result.scalars().all()

@router.post("/objectives", response_model=StoreActionObjectiveResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def create_objective(
    obj_in: StoreActionObjectiveCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new custom action objective."""
    business = await get_business(db, current_user.id)
    
    # Check if objective with the same name already exists for this business
    res_exist = await db.execute(
        select(StoreActionObjective)
        .where(StoreActionObjective.business_id == business.id, StoreActionObjective.name == obj_in.name)
    )
    if res_exist.scalars().first():
        raise HTTPException(status_code=400, detail=f"Objective '{obj_in.name}' already exists")
        
    obj = StoreActionObjective(
        business_id=business.id,
        **obj_in.model_dump()
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/objectives/{obj_id}", dependencies=[Depends(require_feature("b2b_solutions"))])
async def delete_objective(
    obj_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete a custom action objective."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(StoreActionObjective)
        .where(StoreActionObjective.id == obj_id, StoreActionObjective.business_id == business.id)
    )
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Objective not found")
        
    await db.delete(obj)
    await db.commit()
    return {"status": "success", "message": "Objective deleted"}

