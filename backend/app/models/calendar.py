from sqlalchemy import Column, String, ForeignKey, DateTime
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class BusySlot(Base):
    __tablename__ = "busy_slots"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    source = Column(String, default="google") # 'google', 'manual'
    
    # Provider-specific ID to avoid duplicates
    external_id = Column(String, nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
