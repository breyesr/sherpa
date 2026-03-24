from sqlalchemy import Column, String, ForeignKey, Integer, JSON, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class Service(Base):
    __tablename__ = "services"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    duration_minutes = Column(Integer, default=60)
    price = Column(String, nullable=True) # "100.00" or similar
    
    # Flexible attributes (Epic 12)
    attributes = Column(JSON, nullable=True, default=dict)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", back_populates="services")
    appointments = relationship("Appointment", back_populates="service")
