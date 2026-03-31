from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.crm import ClientResponse

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    platform_message_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: str
    business_id: str
    client_id: str
    platform: str
    platform_chat_id: str
    last_message_at: Optional[datetime] = None
    is_active: bool
    ai_enabled: bool
    extra_data: Optional[Dict[str, Any]] = {}
    created_at: datetime
    updated_at: datetime
    
    # Eagerly loaded
    client: Optional[ClientResponse] = None

    class Config:
        from_attributes = True
