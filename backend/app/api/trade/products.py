from typing import Any, List
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from uuid_extensions import uuid7str
from app.core.database import get_db
from app.api.auth import get_current_user, require_any_feature
from app.models.user import User
from app.models.trade import Category, Product
from app.schemas.trade import (
    CategoryResponse, CategoryCreate, CategoryUpdate,
    ProductResponse, ProductCreate, ProductUpdate
)

logger = logging.getLogger(__name__)

router = APIRouter()

# --- CATEGORIES ---

@router.get("/categories", response_model=List[CategoryResponse], dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all product categories with product counts and custom field schemas."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    stmt = (
        select(Category, func.count(Product.id).label("product_count"))
        .outerjoin(Product, Product.category_id == Category.id)
        .where(Category.business_id == business.id)
        .group_by(Category.id)
        .order_by(Category.name)
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    categories = []
    for cat, p_count in rows:
        categories.append(CategoryResponse(
            id=cat.id,
            business_id=cat.business_id,
            name=cat.name,
            description=cat.description,
            category_type=cat.category_type,
            external_id=cat.external_id,
            fields_config=cat.fields_config or [],
            created_at=cat.created_at,
            updated_at=cat.updated_at,
            product_count=p_count or 0
        ))
    return categories

@router.get("/categories/{category_id}", response_model=CategoryResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def get_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get a single category with its fields_config and product count."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    stmt = (
        select(Category, func.count(Product.id).label("product_count"))
        .outerjoin(Product, Product.category_id == Category.id)
        .where(Category.id == category_id, Category.business_id == business.id)
        .group_by(Category.id)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    cat, p_count = row
    return CategoryResponse(
        id=cat.id,
        business_id=cat.business_id,
        name=cat.name,
        description=cat.description,
        category_type=cat.category_type,
        external_id=cat.external_id,
        fields_config=cat.fields_config or [],
        created_at=cat.created_at,
        updated_at=cat.updated_at,
        product_count=p_count or 0
    )

@router.post("/categories", response_model=CategoryResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new category with dynamic custom fields schema."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    category_data = category_in.model_dump()
    category = Category(id=uuid7str(), business_id=business.id, **category_data)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return CategoryResponse(
        id=category.id,
        business_id=category.business_id,
        name=category.name,
        description=category.description,
        category_type=category.category_type,
        external_id=category.external_id,
        fields_config=category.fields_config or [],
        created_at=category.created_at,
        updated_at=category.updated_at,
        product_count=0
    )

@router.patch("/categories/{category_id}", response_model=CategoryResponse, dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def update_category(
    category_id: str,
    category_in: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update category metadata or fields_config schema."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.business_id == business.id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    update_data = category_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
        
    await db.commit()
    await db.refresh(category)
    
    count_res = await db.execute(
        select(func.count(Product.id)).where(Product.category_id == category.id)
    )
    p_count = count_res.scalar() or 0
    
    return CategoryResponse(
        id=category.id,
        business_id=category.business_id,
        name=category.name,
        description=category.description,
        category_type=category.category_type,
        external_id=category.external_id,
        fields_config=category.fields_config or [],
        created_at=category.created_at,
        updated_at=category.updated_at,
        product_count=p_count
    )

@router.delete("/categories/{category_id}", dependencies=[Depends(require_any_feature(["campaign_flow", "b2b_solutions", "products"]))])
async def delete_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete a category. Rejects deletion if products are currently assigned to it."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.business_id == business.id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    count_res = await db.execute(
        select(func.count(Product.id)).where(Product.category_id == category.id)
    )
    product_count = count_res.scalar() or 0
    if product_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category '{category.name}'. It currently contains {product_count} product(s). Reassign or delete those products first."
        )
        
    await db.delete(category)
    await db.commit()
    return {"status": "success", "message": f"Category '{category.name}' deleted successfully."}

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

    try:
        from app.tasks.knowledge import generate_product_summary
        generate_product_summary.delay(product.id)
    except Exception as e:
        logger.error(f"Failed to dispatch generate_product_summary for product {product.id}: {e}")

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
            
    content_fields_changed = any(f in update_data for f in ["description", "custom_fields"])
    for field, value in update_data.items():
        setattr(product, field, value)
        
    await db.commit()
    await db.refresh(product)

    if content_fields_changed:
        try:
            from app.tasks.knowledge import generate_product_summary
            generate_product_summary.delay(product.id)
        except Exception as e:
            logger.error(f"Failed to dispatch generate_product_summary for product {product.id}: {e}")

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
        
    from app.models.trade.orders import OrderItem
    item_count_res = await db.execute(
        select(func.count(OrderItem.id)).where(OrderItem.product_id == product.id)
    )
    item_count = item_count_res.scalar() or 0
    if item_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete product '{product.name}'. It is referenced in {item_count} order record(s). Archiving or reassignment is required."
        )
        
    await db.delete(product)
    await db.commit()
    return {"status": "success", "message": "Product deleted"}
