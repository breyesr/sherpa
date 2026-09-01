import enum
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime

class VerticalType(str, enum.Enum):
    BASIC = "BASIC"
    TRADE = "TRADE"

class AgentBase(BaseModel):
    name: str
    role: str = "general"
    is_active: bool = True
    tone: str
    greeting: str
    personalized_greeting: str = "Hola {name}, ¿en qué puedo ayudarte hoy?"
    logic_template: str = "standard"
    custom_steps: Optional[str] = None
    require_reason: Optional[bool] = True
    confirm_details: Optional[bool] = True
    strict_guardrails: Optional[bool] = True
    
    # Escalation Path
    enable_honesty: bool = True
    enable_internal_alert: bool = False
    enable_lead_capture: bool = True
    enable_emergency_phone: bool = False
    
    # Pricing Disclosure Toggle (Epic 220)
    allow_price_disclosure: bool = True
    
    working_hours: Optional[Dict[str, List[str]]] = None

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    tone: Optional[str] = None
    greeting: Optional[str] = None
    personalized_greeting: Optional[str] = None
    logic_template: Optional[str] = None
    custom_steps: Optional[str] = None
    require_reason: Optional[bool] = None
    confirm_details: Optional[bool] = None
    strict_guardrails: Optional[bool] = None
    enable_honesty: Optional[bool] = None
    enable_internal_alert: Optional[bool] = None
    enable_lead_capture: Optional[bool] = None
    enable_emergency_phone: Optional[bool] = None
    allow_price_disclosure: Optional[bool] = None
    working_hours: Optional[Dict[str, List[str]]] = None

class AgentResponse(AgentBase):
    id: str
    business_id: str

    class Config:
        from_attributes = True

class IntegrationResponse(BaseModel):
    id: str
    provider: str
    settings: Optional[Dict] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BusinessProfileBase(BaseModel):
    name: str
    category: Optional[str] = None
    contact_phone: Optional[str] = None
    timezone: str = "UTC"
    vertical_type: VerticalType = VerticalType.BASIC
    crm_config: Optional[List[Dict]] = []
    catalog_config: Optional[List[Dict]] = []
    features_config: Optional[Dict] = None
    routing_config: Optional[Dict] = None

class BusinessProfileCreate(BusinessProfileBase):
    pass

class BusinessProfileUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    contact_phone: Optional[str] = None
    timezone: Optional[str] = None
    vertical_type: Optional[VerticalType] = None
    crm_config: Optional[List[Dict]] = None
    catalog_config: Optional[List[Dict]] = None
    features_config: Optional[Dict] = None
    routing_config: Optional[Dict] = None

class BusinessProfileResponse(BusinessProfileBase):
    id: str
    user_id: str
    trial_expires_at: Optional[datetime] = None
    is_active: bool
    agents: List[AgentResponse] = []
    assistant_config: Optional[AgentResponse] = None # Support backward compatibility property
    integrations: List[IntegrationResponse] = []
    purchased_credits: int = 0

    class Config:
        from_attributes = True

