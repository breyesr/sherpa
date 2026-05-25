from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime
import enum

class ImportStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class DataImportBase(BaseModel):
    file_name: str
    entity_type: str
    mapping: Dict[str, str]

class DataImportCreate(DataImportBase):
    pass

class DataImportResponse(DataImportBase):
    id: str
    business_id: str
    status: ImportStatus
    results: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DataGatewaySyncRequest(BaseModel):
    entity_type: str
    data: Dict[str, Any]
    mapping: Optional[Dict[str, str]] = None
