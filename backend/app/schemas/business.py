from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime

class AssistantConfigBase(BaseModel):
    name: str
    tone: str
    greeting: str
    personalized_greeting: str = "Hola {name}, ¿en qué puedo ayudarte hoy?"
    logic_template: str = "standard"
    custom_steps: Optional[str] = None
    require_reason: Optional[bool] = True
    confirm_details: Optional[bool] = True
    strict_guardrails: Optional[bool] = True
    working_hours: Optional[Dict[str, List[str]]] = None

class AssistantConfigCreate(AssistantConfigBase):
    pass

class AssistantConfigUpdate(BaseModel):
    name: Optional[str] = None
    tone: Optional[str] = None
    greeting: Optional[str] = None
    personalized_greeting: Optional[str] = None
    logic_template: Optional[str] = None
    custom_steps: Optional[str] = None
    require_reason: Optional[bool] = None
    confirm_details: Optional[bool] = None
    strict_guardrails: Optional[bool] = None
    working_hours: Optional[Dict[str, List[str]]] = None

class AssistantConfigResponse(AssistantConfigBase):
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

class BusinessProfileCreate(BusinessProfileBase):
    pass

class BusinessProfileUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    contact_phone: Optional[str] = None
    timezone: Optional[str] = None

class BusinessProfileResponse(BusinessProfileBase):
    id: str
    user_id: str
    trial_expires_at: Optional[datetime] = None
    is_active: bool
    assistant_config: Optional[AssistantConfigResponse] = None
    integrations: List[IntegrationResponse] = []

    class Config:
        from_attributes = True
