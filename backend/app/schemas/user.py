from pydantic import BaseModel, EmailStr
from typing import Optional, Any

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    vertical_type: Optional[str] = None

class UserCreateAdmin(UserBase):
    password: str
    role: str = "member"
    is_active: bool = True
    is_admin: bool = False

class UserResponse(UserBase):
    id: str
    is_active: Optional[bool] = True
    is_admin: Optional[bool] = False
    role: Optional[str] = "member"
    business_profile: Optional[Any] = None # Avoid circular import, use Any for now or import later

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
