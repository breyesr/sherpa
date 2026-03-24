from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, timezone
from app.schemas.service import ServiceResponse

class ClientBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    custom_fields: Optional[dict] = {}

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    custom_fields: Optional[dict] = None

class ClientResponse(ClientBase):
    id: str
    business_id: str
    telegram_id_hash: Optional[str] = None
    whatsapp_id_hash: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AppointmentBase(BaseModel):
    client_id: str
    service_id: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: str = "scheduled"
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    service_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class AppointmentResponse(AppointmentBase):
    id: str
    business_id: str
    google_event_id: Optional[str] = None
    client: Optional[ClientResponse] = None
    service: Optional[ServiceResponse] = None

    @field_validator("start_time", "end_time")
    @classmethod
    def ensure_utc(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

    class Config:
        from_attributes = True
