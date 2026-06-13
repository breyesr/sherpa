from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.auth import get_current_user
from app.core.ai_service import AIService
from app.services.graphrag import GraphRAGService
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.trade import Store, StoreNote, Category, Product, Order, OrderItem, Competitor
from app.schemas.trade import (
    StoreResponse, StoreCreate, StoreUpdate,
    CategoryResponse, CategoryCreate,
    ProductResponse, ProductCreate,
    StoreNoteResponse, StoreNoteCreate,
    OrderResponse, OrderCreate,
    CompetitorResponse, CompetitorCreate
)

router = APIRouter()

async def get_business(db: AsyncSession, user_id: str) -> BusinessProfile:
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

# --- STORES ---

@router.get("/stores", response_model=List[StoreResponse])
async def list_stores(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all stores for the current business."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(Store)
        .where(Store.business_id == business.id)
        .options(
            selectinload(Store.notes),
            selectinload(Store.clients)
        )
    )
    return result.scalars().all()

@router.post("/stores", response_model=StoreResponse)
async def create_store(
    store_in: StoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new store."""
    business = await get_business(db, current_user.id)
    
    store = Store(
        business_id=business.id, 
        name=store_in.name,
        address=store_in.address,
        external_id=store_in.external_id
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

    db.add(store)
    await db.commit()
    
    # Reload with relationships for the response
    result = await db.execute(
        select(Store)
        .where(Store.id == store.id)
        .options(selectinload(Store.notes), selectinload(Store.clients))
    )
    return result.scalars().first()

@router.get("/stores/{store_id}", response_model=StoreResponse)
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

@router.post("/stores/{store_id}/notes", response_model=StoreNoteResponse)
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
    await db.refresh(note)
    return note

@router.patch("/stores/{store_id}", response_model=StoreResponse)
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
    
    # Handle multiple client_ids
    if store_in.client_ids is not None:
        from app.models.crm import Client
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

    update_data = store_in.model_dump(exclude_unset=True, exclude={"client_ids"})
    for field, value in update_data.items():
        setattr(store, field, value)
        
    db.add(store)
    await db.commit()
    
    # Reload with relationships for the response
    res_final = await db.execute(
        select(Store)
        .where(Store.id == store.id)
        .options(selectinload(Store.notes), selectinload(Store.clients))
    )
    return res_final.scalars().first()

# --- CATEGORIES ---

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all product categories."""
    business = await get_business(db, current_user.id)
    result = await db.execute(select(Category).where(Category.business_id == business.id))
    return result.scalars().all()

@router.post("/categories", response_model=CategoryResponse)
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

@router.get("/products", response_model=List[ProductResponse])
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

@router.post("/products", response_model=ProductResponse)
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

# --- ORDERS ---

@router.get("/orders", response_model=List[OrderResponse])
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

@router.post("/orders", response_model=OrderResponse)
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

# --- COMPETITORS ---

@router.get("/competitors", response_model=List[CompetitorResponse])
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

@router.post("/competitors", response_model=CompetitorResponse)
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
    await db.refresh(competitor)
    return competitor

# --- AI INSIGHTS ---

@router.get("/stores/{store_id}/brief")
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

@router.post("/clients/{client_id}/brief")
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

@router.post("/clients/{client_id}/qualify")
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
