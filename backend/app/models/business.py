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
    timezone = Column(String, nullable=False, default="UTC")
    trial_expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="business_profile")
    assistant_config = relationship("AssistantConfig", back_populates="business_profile", uselist=False, cascade="all, delete-orphan")
    integrations = relationship("Integration", back_populates="business_profile", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="business_profile", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="business_profile", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="business_profile", cascade="all, delete-orphan")

class AssistantConfig(Base):
    __tablename__ = "assistant_configs"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), unique=True, nullable=False)
    name = Column(String, nullable=False, default="Sherpa Assistant")
    tone = Column(String, nullable=False, default="Professional")
    greeting = Column(String, nullable=False, default="Hello! How can I help you today?")
    personalized_greeting = Column(String, nullable=False, default="Hola {name}, ¿en qué puedo ayudarte hoy?")
    logic_template = Column(String, nullable=False, default="standard") # standard, custom_steps
    custom_steps = Column(String, nullable=True) # JSON or markdown string of steps
    
    # Behavioral Toggles (Instruction Assembler)
    require_reason = Column(Boolean, default=True)
    confirm_details = Column(Boolean, default=True)
    strict_guardrails = Column(Boolean, default=True)
    
    # Smart Escalation Chain (Epic 12.5)
    enable_honesty = Column(Boolean, default=True)
    enable_internal_alert = Column(Boolean, default=False)
    enable_lead_capture = Column(Boolean, default=True)
    enable_emergency_phone = Column(Boolean, default=False)
    
    working_hours = Column(JSON, nullable=True) # e.g., {"mon": ["09:00", "18:00"], ...}

    business_profile = relationship("BusinessProfile", back_populates="assistant_config")
