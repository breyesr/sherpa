from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import enum

class StoreNoteType(str, enum.Enum):
    RISK = "risk"
    OPPORTUNITY = "opportunity"
    ACTION = "action"
    GENERAL = "general"

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class StoreNoteBase(BaseModel):
    note: str
    risks: Optional[str] = None
    opportunities: Optional[str] = None
    preferred_actions: Optional[str] = None

class StoreNoteCreate(StoreNoteBase):
    pass

class StoreNoteResponse(StoreNoteBase):
    id: str
    store_id: str
    author_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StoreBase(BaseModel):
    name: str
    address: Optional[str] = None
    external_id: Optional[str] = None

class StoreCreate(StoreBase):
    client_ids: Optional[List[str]] = []

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    external_id: Optional[str] = None
    client_ids: Optional[List[str]] = None

class ClientMinimal(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True

class StoreResponse(StoreBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime
    notes: List[StoreNoteResponse] = []
    clients: List[ClientMinimal] = []

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = 0.0
    sku: Optional[str] = None

class ProductCreate(ProductBase):
    category_id: str

class ProductResponse(ProductBase):
    id: str
    category_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OrderItemBase(BaseModel):
    product_id: str
    quantity: int = 1
    unit_price: float

class OrderItemResponse(OrderItemBase):
    id: str
    order_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    store_id: str
    client_id: Optional[str] = None
    status: OrderStatus = OrderStatus.PENDING
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    items: List[OrderItemBase]

class OrderResponse(OrderBase):
    id: str
    business_id: str
    total_amount: float
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True

class CompetitorBase(BaseModel):
    name: str
    store_id: str
    presence_level: Optional[str] = None
    notes: Optional[str] = None

class CompetitorCreate(CompetitorBase):
    pass

class CompetitorResponse(CompetitorBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CustomerNoteBase(BaseModel):
    client_id: str
    comm_style: Optional[str] = None
    visit_frequency: Optional[str] = None
    preferred_actions: Optional[str] = None
    general_notes: Optional[str] = None

class CustomerNoteCreate(CustomerNoteBase):
    pass

class CustomerNoteResponse(CustomerNoteBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
