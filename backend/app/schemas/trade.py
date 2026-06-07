from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date
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
    store_id: str
    note: str
    risks: Optional[str] = None
    opportunities: Optional[str] = None
    preferred_actions: Optional[str] = None
    execution_level: Optional[str] = None
    note_type: str = "general"
    is_actionable: bool = False
    action_metadata: Optional[Dict[str, Any]] = {}

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
    phone: Optional[str] = None
    email: Optional[str] = None
    market: Optional[str] = None
    segment: Optional[str] = None
    region: Optional[str] = None
    opening_date: Optional[date] = None
    external_id: Optional[str] = None

class StoreCreate(StoreBase):
    client_ids: Optional[List[str]] = []

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    market: Optional[str] = None
    segment: Optional[str] = None
    region: Optional[str] = None
    opening_date: Optional[date] = None
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
    product_type: Optional[str] = None
    brand: Optional[str] = None
    unit_of_measure: Optional[str] = None
    external_id: Optional[str] = None

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
    delivery_id: Optional[str] = None
    delivery_date: Optional[date] = None
    payment_method: Optional[str] = None
    shipping_address: Optional[str] = None

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
    phone: Optional[str] = None
    address: Optional[str] = None
    market: Optional[str] = None
    region: Optional[str] = None
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
    last_visit_date: Optional[date] = None
    next_visit_date: Optional[date] = None
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
