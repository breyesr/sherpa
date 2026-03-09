from sqlalchemy import Column, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class Integration(Base):
    __tablename__ = "integrations"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    provider = Column(String, nullable=False) # e.g., 'google', 'whatsapp'
    
    # OAuth tokens
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    token_expiry = Column(DateTime, nullable=True)
    
    # Provider-specific metadata (e.g., calendar ID, WhatsApp number ID)
    settings = Column(JSON, nullable=True, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", back_populates="integrations")
