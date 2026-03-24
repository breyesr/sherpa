from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int = 60
    price: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = {}
    is_active: bool = True

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class ServiceResponse(ServiceBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
