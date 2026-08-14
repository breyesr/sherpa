from sqlalchemy import Column, String, DateTime
from datetime import datetime
from app.core.database import Base
from uuid_extensions import uuid7str

class DemoRequest(Base):
    """
    Model for recording user requests for a demo or new account.
    """
    __tablename__ = "demo_requests"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    name = Column(String, nullable=False)
    business_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    primary_use_case = Column(String, nullable=False)
    status = Column(String, default="pending", nullable=False) # e.g., 'pending', 'contacted', 'converted', 'rejected'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
