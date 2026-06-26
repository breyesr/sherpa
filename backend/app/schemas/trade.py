from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import enum
from app.models.trade import ActionCategory, ActionObjective, ActionStatus

class StoreNoteType(str, enum.Enum):
    RISK = "risk"
    OPPORTUNITY = "opportunity"
    THREAT = "threat"
    ANNIVERSARY = "anniversary"
    ACTION = "action"
    GENERAL = "general"

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class DataSourceType(str, enum.Enum):
    MANUAL = "manual"
    AI_EXTRACTED = "ai_extracted"
    INTEGRATION = "integration"
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
    source_type: DataSourceType = DataSourceType.MANUAL
    is_verified: bool = True

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

class PostalCodeResponse(BaseModel):
    id: int
    zip_code: str
    colonia: str
    municipality: str
    city: Optional[str] = None
    state: str

    class Config:
        from_attributes = True


class StoreBase(BaseModel):
    name: str
    address: Optional[str] = None  # Kept as formatted address helper for backward compatibility
    phone: Optional[str] = None
    email: Optional[str] = None
    
    # Structured address fields
    street_address: Optional[str] = None
    colonia: Optional[str] = None
    municipality: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = "México"
    
    market: Optional[str] = None
    segment: Optional[str] = None
    region: Optional[str] = None
    opening_date: Optional[date] = None
    external_id: Optional[str] = None
    is_prospect: bool = False
    delivery_zip_codes: Optional[List[str]] = []


class StoreCreate(StoreBase):
    client_ids: Optional[List[str]] = []


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    
    # Structured address fields
    street_address: Optional[str] = None
    colonia: Optional[str] = None
    municipality: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    
    market: Optional[str] = None
    segment: Optional[str] = None
    region: Optional[str] = None
    opening_date: Optional[date] = None
    external_id: Optional[str] = None
    client_ids: Optional[List[str]] = None
    is_prospect: Optional[bool] = None
    delivery_zip_codes: Optional[List[str]] = None


class ClientMinimal(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    is_prospect: bool = False

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
    wholesale_threshold: Optional[int] = None

class ProductCreate(ProductBase):
    category_id: str

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    brand: Optional[str] = None
    product_type: Optional[str] = None
    unit_of_measure: Optional[str] = None
    external_id: Optional[str] = None
    wholesale_threshold: Optional[int] = None

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
    source_type: DataSourceType = DataSourceType.MANUAL
    is_verified: bool = True

class OrderCreate(OrderBase):
    items: List[OrderItemBase]

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None
    delivery_id: Optional[str] = None
    delivery_date: Optional[date] = None
    payment_method: Optional[str] = None
    shipping_address: Optional[str] = None

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
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    source_type: DataSourceType = DataSourceType.MANUAL
    is_verified: bool = True

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
    note_type: str = "general"
    risks: Optional[str] = None
    opportunities: Optional[str] = None
    source_type: DataSourceType = DataSourceType.MANUAL
    is_verified: bool = True

class CustomerNoteCreate(CustomerNoteBase):
    pass

class CustomerNoteResponse(CustomerNoteBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- ACTION TEMPLATE SCHEMAS ---

class ActionTemplateBase(BaseModel):
    name: str
    category: ActionCategory
    default_unit: str
    description: Optional[str] = None

class ActionTemplateCreate(ActionTemplateBase):
    pass

class ActionTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[ActionCategory] = None
    default_unit: Optional[str] = None
    description: Optional[str] = None

class ActionTemplateResponse(ActionTemplateBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- STORE ACTION SCHEMAS ---

class StoreActionBase(BaseModel):
    store_id: str
    template_id: Optional[str] = None
    assigned_to_id: Optional[str] = None
    category: ActionCategory
    objective: ActionObjective
    impact_level: Optional[str] = None
    note_source_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = {}
    status: ActionStatus = ActionStatus.PROPOSED
    due_date: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    result_value: Optional[float] = None
    result_unit: Optional[str] = None
    revenue_impact: Optional[float] = None

class StoreActionCreate(StoreActionBase):
    pass

class StoreActionUpdate(BaseModel):
    assigned_to_id: Optional[str] = None
    template_id: Optional[str] = None
    category: Optional[ActionCategory] = None
    objective: Optional[ActionObjective] = None
    impact_level: Optional[str] = None
    status: Optional[ActionStatus] = None
    due_date: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    result_value: Optional[float] = None
    result_unit: Optional[str] = None
    revenue_impact: Optional[float] = None

class StoreActionResponse(StoreActionBase):
    id: str
    business_id: str
    author_id: Optional[str] = None
    assigned_to_id: Optional[str] = None
    
    # Enriched fields to avoid client-side N+1 fetch loops
    store_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    template_name: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

