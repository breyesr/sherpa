from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload

from app.core.database import get_db
from app.api.auth import get_current_user
from app.core.ai_service import AIService
from app.services.graphrag import GraphRAGService
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.trade import Store, StoreNote, Category, Product, Order, OrderItem, Competitor, ActionTemplate, StoreAction
from app.schemas.trade import (
    StoreResponse, StoreCreate, StoreUpdate,
    CategoryResponse, CategoryCreate,
    ProductResponse, ProductCreate, ProductUpdate,
    StoreNoteResponse, StoreNoteCreate,
    OrderResponse, OrderCreate, OrderUpdate,
    CompetitorResponse, CompetitorCreate,
    ActionTemplateCreate, ActionTemplateResponse, ActionTemplateUpdate,
    StoreActionCreate, StoreActionResponse, StoreActionUpdate
)

from app.tasks.knowledge import sync_vector_task

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
    sync_vector_task.delay(str(store.id), "store", str(business.id))
    
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
    sync_vector_task.delay(str(note.id), "store_note", str(business.id))
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
    sync_vector_task.delay(str(store.id), "store", str(business.id))
    
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

@router.get("/products/{product_id}", response_model=ProductResponse)
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

@router.patch("/products/{product_id}", response_model=ProductResponse)
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

@router.delete("/products/{product_id}")
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

@router.get("/orders/{order_id}", response_model=OrderResponse)
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

@router.patch("/orders/{order_id}", response_model=OrderResponse)
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


# ==========================================
# --- ACTION TEMPLATE CATALOG ENDPOINTS ---
# ==========================================

from typing import Optional

@router.get("/action-templates", response_model=List[ActionTemplateResponse])
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

@router.post("/action-templates", response_model=ActionTemplateResponse)
async def create_action_template(
    template_in: ActionTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new action template."""
    business = await get_business(db, current_user.id)
    
    template = ActionTemplate(
        business_id=business.id,
        **template_in.model_dump()
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template

@router.patch("/action-templates/{template_id}", response_model=ActionTemplateResponse)
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
    for field, value in update_data.items():
        setattr(template, field, value)
        
    await db.commit()
    await db.refresh(template)
    return template

@router.delete("/action-templates/{template_id}")
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

@router.get("/actions", response_model=List[StoreActionResponse])
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
        action.assigned_to_name = action.assigned_to.email if action.assigned_to else None
        action.template_name = action.template.name if action.template else None
        
    return actions

@router.get("/actions/{action_id}", response_model=StoreActionResponse)
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
    action.assigned_to_name = action.assigned_to.email if action.assigned_to else None
    action.template_name = action.template.name if action.template else None
    return action

@router.post("/actions", response_model=StoreActionResponse)
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
    
    # Auto-assign result_unit and category from template if template_id is provided
    if action_in.template_id:
        res_tpl = await db.execute(
            select(ActionTemplate)
            .where(ActionTemplate.id == action_in.template_id, ActionTemplate.business_id == business.id)
        )
        template = res_tpl.scalars().first()
        if not template:
            raise HTTPException(status_code=400, detail="Invalid template ID")
        
        action_data["category"] = template.category
        if not action_data.get("result_unit"):
            action_data["result_unit"] = template.default_unit
            
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
    enriched.assigned_to_name = enriched.assigned_to.email if enriched.assigned_to else None
    enriched.template_name = enriched.template.name if enriched.template else None
    return enriched

@router.patch("/actions/{action_id}", response_model=StoreActionResponse)
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
    action.assigned_to_name = action.assigned_to.email if action.assigned_to else None
    action.template_name = action.template.name if action.template else None
    return action

@router.delete("/actions/{action_id}")
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

