from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, timezone

class ClientBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class ClientResponse(ClientBase):
    id: str
    business_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class AppointmentBase(BaseModel):
    client_id: str
    start_time: datetime
    end_time: datetime
    status: str = "scheduled"

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None

class AppointmentResponse(AppointmentBase):
    id: str
    business_id: str
    google_event_id: Optional[str] = None
    client: Optional[ClientResponse] = None

    @field_validator("start_time", "end_time")
    @classmethod
    def ensure_utc(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

    class Config:
        from_attributes = True
