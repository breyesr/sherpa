from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(String, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String, nullable=False) # 'telegram', 'whatsapp', 'sandbox'
    platform_chat_id = Column(String, nullable=False, index=True) # The external ID (encrypted or hashed)
    
    last_message_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    ai_enabled = Column(Boolean, default=True) # Whether the AI should respond to this chat
    
    # Metadata for the UI (e.g. unread count, etc)
    extra_data = Column(JSON, nullable=True, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", backref="conversations")
    client = relationship("Client", backref="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    
    role = Column(String, nullable=False) # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    
    # Optional: store external message IDs for reference or delivery receipts
    platform_message_id = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
