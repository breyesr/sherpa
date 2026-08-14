from pydantic import BaseModel, EmailStr
from datetime import datetime

class DemoRequestCreate(BaseModel):
    name: str
    business_name: str
    email: EmailStr
    phone_number: str
    primary_use_case: str

class DemoRequestResponse(BaseModel):
    id: str
    name: str
    business_name: str
    email: EmailStr
    phone_number: str
    primary_use_case: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
