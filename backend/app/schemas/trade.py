from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import enum

class StoreNoteType(str, enum.Enum):
    RISK = "risk"
    OPPORTUNITY = "opportunity"
    ACTION = "action"
    GENERAL = "general"

class StoreNoteBase(BaseModel):
    type: StoreNoteType = StoreNoteType.GENERAL
    content: str

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
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    external_id: Optional[str] = None

class StoreCreate(StoreBase):
    pass

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    external_id: Optional[str] = None

class StoreResponse(StoreBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime
    notes: List[StoreNoteResponse] = []

    class Config:
        from_attributes = True
