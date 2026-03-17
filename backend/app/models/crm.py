from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime
import hashlib

class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True, index=True)
    email = Column(String, nullable=True)
    
    # External Messaging IDs (Encrypted at rest)
    telegram_id = Column(String, nullable=True)
    whatsapp_id = Column(String, nullable=True)
    
    # Searchable Hashes (Blind Indexes for privacy-preserving search)
    telegram_id_hash = Column(String, nullable=True, index=True)
    whatsapp_id_hash = Column(String, nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('business_id', 'telegram_id_hash', name='_business_telegram_hash_uc'),
        UniqueConstraint('business_id', 'whatsapp_id_hash', name='_business_whatsapp_hash_uc'),
    )

    business_profile = relationship("BusinessProfile", back_populates="clients")
    appointments = relationship("Appointment", back_populates="client", cascade="all, delete-orphan")

    @staticmethod
    def hash_id(id_val: str) -> str:
        if not id_val:
            return None
        return hashlib.sha256(id_val.encode()).hexdigest()

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(String, default="scheduled") # scheduled, confirmed, cancelled, completed
    reminder_sent = Column(Boolean, default=False)
    
    # Link to Google Calendar event if synced
    google_event_id = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", back_populates="appointments")
    client = relationship("Client", back_populates="appointments")
