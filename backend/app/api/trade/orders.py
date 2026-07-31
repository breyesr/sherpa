from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.auth import get_current_user, require_feature, require_any_feature
from app.models.user import User
from app.models.trade import Store, Order, OrderItem, Product
from app.schemas.trade import OrderResponse, OrderCreate, OrderUpdate

router = APIRouter()

# --- ORDERS ---

@router.get("/prospects/orders", response_model=List[OrderResponse], dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def list_prospect_orders(
    segment: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all prospecting/unverified orders for the business, partitioned by segment."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
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
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
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
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    
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

@router.get("/orders/{order_id}", response_model=OrderResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def get_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get detail of a single order by ID."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    query = select(Order).where(
        Order.id == order_id, 
        Order.business_id == business.id
    ).options(selectinload(Order.items))
    result = await db.execute(query)
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.patch("/orders/{order_id}", response_model=OrderResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions"]))])
async def update_order(
    order_id: str,
    order_in: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update order metadata or status."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
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
