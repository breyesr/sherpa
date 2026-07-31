from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.api.auth import get_current_user, require_any_feature
from app.models.user import User
from app.models.trade import Category, Product
from app.schemas.trade import (
    CategoryResponse, CategoryCreate,
    ProductResponse, ProductCreate, ProductUpdate
)

router = APIRouter()

# --- CATEGORIES ---

@router.get("/categories", response_model=List[CategoryResponse], dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all product categories."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    result = await db.execute(select(Category).where(Category.business_id == business.id))
    return result.scalars().all()

@router.post("/categories", response_model=CategoryResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new category."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
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
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
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
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
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
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
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
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
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
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
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
