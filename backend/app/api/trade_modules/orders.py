"""
Order CRUD & Status Management sub-router.
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.auth import get_current_user, require_feature, require_any_feature
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.trade import Store, Order, OrderItem
from app.schemas.trade import OrderResponse, OrderCreate, OrderUpdate

router = APIRouter()

async def get_business(db: AsyncSession, user_id: str) -> BusinessProfile:
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

@router.get("/orders", response_model=List[OrderResponse], dependencies=[Depends(require_any_feature(["b2b_solutions", "products"]))])
async def list_orders(
    store_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List orders."""
    business = await get_business(db, current_user.id)
    stmt = select(Order).where(Order.business_id == business.id)
    if store_id:
        stmt = stmt.where(Order.store_id == store_id)

    stmt = stmt.options(
        selectinload(Order.store),
        selectinload(Order.client),
        selectinload(Order.items).selectinload(OrderItem.product)
    ).order_by(Order.created_at.desc())

    res_orders = await db.execute(stmt)
    return res_orders.scalars().all()

@router.post("/orders", response_model=OrderResponse, dependencies=[Depends(require_any_feature(["b2b_solutions", "products"]))])
async def create_order(
    order_in: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create order."""
    business = await get_business(db, current_user.id)
    res_store = await db.execute(select(Store).where(Store.id == order_in.store_id, Store.business_id == business.id))
    if not res_store.scalars().first():
        raise HTTPException(status_code=400, detail="Invalid store_id for this business")

    items_data = order_in.items
    order_dict = order_in.model_dump(exclude={"items"})
    order = Order(**order_dict, business_id=business.id, user_id=current_user.id)

    total = 0.0
    for item_in in items_data:
        subtotal = float(item_in.unit_price) * item_in.quantity
        total += subtotal
        item = OrderItem(
            product_id=item_in.product_id,
            quantity=item_in.quantity,
            unit_price=item_in.unit_price,
            subtotal=subtotal
        )
        order.items.append(item)

    order.total_amount = total
    db.add(order)
    await db.commit()

    res_order = await db.execute(
        select(Order)
        .where(Order.id == order.id)
        .options(
            selectinload(Order.store),
            selectinload(Order.client),
            selectinload(Order.items).selectinload(OrderItem.product)
        )
    )
    order_obj = res_order.scalars().first()

    from app.tasks.knowledge import sync_vector_task
    sync_vector_task.delay(order.id, "order", business.id)

    return order_obj

@router.get("/orders/{order_id}", response_model=OrderResponse, dependencies=[Depends(require_any_feature(["b2b_solutions", "products"]))])
async def get_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get single order details."""
    business = await get_business(db, current_user.id)
    stmt = select(Order).where(Order.id == order_id, Order.business_id == business.id).options(
        selectinload(Order.store),
        selectinload(Order.client),
        selectinload(Order.items).selectinload(OrderItem.product)
    )
    res_order = await db.execute(stmt)
    order = res_order.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.patch("/orders/{order_id}", response_model=OrderResponse, dependencies=[Depends(require_any_feature(["b2b_solutions", "products"]))])
async def update_order(
    order_id: str,
    order_in: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update order."""
    business = await get_business(db, current_user.id)
    stmt = select(Order).where(Order.id == order_id, Order.business_id == business.id)
    res_order = await db.execute(stmt)
    order = res_order.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    update_data = order_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)

    db.add(order)
    await db.commit()

    res_updated = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.store),
            selectinload(Order.client),
            selectinload(Order.items).selectinload(OrderItem.product)
        )
    )
    return res_updated.scalars().first()
