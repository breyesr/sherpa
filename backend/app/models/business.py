from sqlalchemy import Column, String, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class BusinessProfile(Base):
    __tablename__ = "business_profiles"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    trial_expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="business_profile")
    assistant_config = relationship("AssistantConfig", back_populates="business_profile", uselist=False)
    integrations = relationship("Integration", back_populates="business_profile", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="business_profile")
    appointments = relationship("Appointment", back_populates="business_profile")

class AssistantConfig(Base):
    __tablename__ = "assistant_configs"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), unique=True, nullable=False)
    name = Column(String, nullable=False, default="Sherpa Assistant")
    tone = Column(String, nullable=False, default="Professional")
    greeting = Column(String, nullable=False, default="Hello! How can I help you today?")
    working_hours = Column(JSON, nullable=True) # e.g., {"mon": ["09:00", "18:00"], ...}

    business_profile = relationship("BusinessProfile", back_populates="assistant_config")
