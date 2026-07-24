"""
Product & Category CRUD sub-router.
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
from app.models.trade import Category, Product
from app.schemas.trade import (
    CategoryResponse, CategoryCreate,
    ProductResponse, ProductCreate, ProductUpdate
)

router = APIRouter()

async def get_business(db: AsyncSession, user_id: str) -> BusinessProfile:
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

@router.get("/categories", response_model=List[CategoryResponse], dependencies=[Depends(require_any_feature(["products", "b2b_solutions"]))])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List product categories."""
    business = await get_business(db, current_user.id)
    res_cat = await db.execute(
        select(Category).where(Category.business_id == business.id).order_by(Category.name)
    )
    return res_cat.scalars().all()

@router.post("/categories", response_model=CategoryResponse, dependencies=[Depends(require_any_feature(["products", "b2b_solutions"]))])
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a product category."""
    business = await get_business(db, current_user.id)
    category = Category(**category_in.model_dump(), business_id=business.id)
    db.add(category)
    await db.commit()
    await db.refresh(category)

    from app.tasks.knowledge import sync_vector_task
    sync_vector_task.delay(category.id, "category", business.id)
    return category

@router.get("/products", response_model=List[ProductResponse], dependencies=[Depends(require_any_feature(["products", "b2b_solutions"]))])
async def list_products(
    category_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List products."""
    business = await get_business(db, current_user.id)
    stmt = select(Product).join(Category).where(Category.business_id == business.id)
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)

    stmt = stmt.options(selectinload(Product.category)).order_by(Product.name)
    res_prod = await db.execute(stmt)
    return res_prod.scalars().all()

@router.post("/products", response_model=ProductResponse, dependencies=[Depends(require_any_feature(["products", "b2b_solutions"]))])
async def create_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new product."""
    business = await get_business(db, current_user.id)
    res_cat = await db.execute(
        select(Category).where(Category.id == product_in.category_id, Category.business_id == business.id)
    )
    if not res_cat.scalars().first():
        raise HTTPException(status_code=400, detail="Invalid category_id for this business")

    product = Product(**product_in.model_dump())
    db.add(product)
    await db.commit()

    res_prod = await db.execute(
        select(Product).where(Product.id == product.id).options(selectinload(Product.category))
    )
    product_obj = res_prod.scalars().first()

    from app.tasks.knowledge import sync_vector_task
    sync_vector_task.delay(product.id, "product", business.id)
    return product_obj

@router.get("/products/{product_id}", response_model=ProductResponse, dependencies=[Depends(require_any_feature(["products", "b2b_solutions"]))])
async def get_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Fetch details for a single product."""
    business = await get_business(db, current_user.id)
    res = await db.execute(
        select(Product).join(Category).where(Product.id == product_id, Category.business_id == business.id).options(selectinload(Product.category))
    )
    product = res.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.patch("/products/{product_id}", response_model=ProductResponse, dependencies=[Depends(require_any_feature(["products", "b2b_solutions"]))])
async def update_product(
    product_id: str,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update a product."""
    business = await get_business(db, current_user.id)
    res = await db.execute(
        select(Product).join(Category).where(Product.id == product_id, Category.business_id == business.id).options(selectinload(Product.category))
    )
    product = res.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.add(product)
    await db.commit()

    from app.tasks.knowledge import sync_vector_task
    sync_vector_task.delay(product.id, "product", business.id)
    return product

@router.delete("/products/{product_id}", dependencies=[Depends(require_any_feature(["products", "b2b_solutions"]))])
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete a product."""
    business = await get_business(db, current_user.id)
    res = await db.execute(
        select(Product).join(Category).where(Product.id == product_id, Category.business_id == business.id)
    )
    product = res.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.delete(product)
    await db.commit()

    from app.tasks.knowledge import delete_vector_task
    delete_vector_task.delay(product_id, "product", business.id)
    return {"status": "deleted"}
