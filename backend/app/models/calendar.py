from sqlalchemy import Column, String, ForeignKey, DateTime, Index
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class BusySlot(Base):
    __tablename__ = "busy_slots"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    source = Column(String, default="google") # 'google', 'manual'
    
    # Provider-specific ID to avoid duplicates
    external_id = Column(String, nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_busy_slots_business_id_start_time', 'business_id', 'start_time'),
    )
