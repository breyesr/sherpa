from sqlalchemy import Column, String, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class Store(Base):
    __tablename__ = "stores"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    market = Column(String, nullable=True) # e.g. Plumbing, Finishes
    segment = Column(String, nullable=True) # e.g. Premium, Mass Market
    region = Column(String, nullable=True)
    opening_date = Column(Date, nullable=True)
    
    # Assigned Sales Rep
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", back_populates="stores")
    assigned_rep = relationship("User")
    contacts = relationship("Customer", back_populates="store", cascade="all, delete-orphan")
    notes = relationship("StoreNote", back_populates="store", cascade="all, delete-orphan")
    competitors = relationship("Competitor", back_populates="store", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="store")
