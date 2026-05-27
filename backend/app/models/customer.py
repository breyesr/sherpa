from sqlalchemy import Column, String, ForeignKey, Date, DateTime, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True, index=True)
    role = Column(String, nullable=True) # e.g. Owner, Purchasing Manager
    birthday = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    
    # Messaging IDs for the Rep to contact them
    telegram_id = Column(String, nullable=True)
    whatsapp_id = Column(String, nullable=True)
    
    # Custom attributes
    custom_fields = Column(JSON, nullable=True, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = relationship("Store", back_populates="contacts")
    notes = relationship("CustomerNote", back_populates="customer", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="customer")
