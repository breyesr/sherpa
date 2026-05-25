from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.trade import Store, StoreNote, Category, Product, Order
from app.schemas.trade import (
    StoreResponse, StoreCreate, StoreUpdate,
    CategoryResponse, CategoryCreate,
    ProductResponse, ProductCreate,
    StoreNoteResponse, StoreNoteCreate
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
            selectinload(Store.client)
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
    
    # Verify client exists and belongs to business if client_id is provided
    if store_in.client_id:
        from app.models.crm import Client
        res_client = await db.execute(
            select(Client).where(Client.id == store_in.client_id, Client.business_id == business.id)
        )
        if not res_client.scalars().first():
            raise HTTPException(status_code=400, detail="Invalid client ID for this business")

    store = Store(business_id=business.id, **store_in.model_dump())
    db.add(store)
    await db.commit()
    await db.refresh(store)
    return store

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
            selectinload(Store.client)
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
    result = await db.execute(select(Store).where(Store.id == store_id, Store.business_id == business.id))
    store = result.scalars().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Verify client belongs to business if changing client_id
    if store_in.client_id and store_in.client_id != store.client_id:
        from app.models.crm import Client
        res_client = await db.execute(
            select(Client).where(Client.id == store_in.client_id, Client.business_id == business.id)
        )
        if not res_client.scalars().first():
            raise HTTPException(status_code=400, detail="Invalid client ID for this business")

    update_data = store_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(store, field, value)
        
    db.add(store)
    await db.commit()
    await db.refresh(store)
    return store

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
