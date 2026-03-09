from sqlalchemy import Column, String, JSON
from app.core.database import Base
from uuid_extensions import uuid7str

class SystemConfiguration(Base):
    """
    Store global system secrets and config.
    Values are encrypted before being stored.
    """
    __tablename__ = "system_configurations"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    key = Column(String, unique=True, index=True, nullable=False) # e.g., 'google_client_id'
    value = Column(String, nullable=False) # Encrypted string
    description = Column(String, nullable=True)
