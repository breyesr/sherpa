from sqlalchemy import Column, String, ForeignKey, DateTime, JSON, Enum as SQLEnum
import enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class ImportStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class DataImport(Base):
    __tablename__ = "data_imports"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=True) # Path to stored file
    
    entity_type = Column(String, nullable=False) # 'client', 'product', 'order', etc.
    status = Column(SQLEnum(ImportStatus), default=ImportStatus.PENDING, nullable=False)
    
    # Mapping configuration: {"header_column": "model_field", ...}
    mapping = Column(JSON, nullable=False)
    
    # Results summary: {"processed": 100, "errors": 5, "details": [...]}
    results = Column(JSON, nullable=True)
    
    error_message = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")
