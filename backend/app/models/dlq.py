from sqlalchemy import Column, String, DateTime, Text, Integer
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class VectorizationDLQ(Base):
    __tablename__ = "vectorization_dlq"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, nullable=False, index=True)
    entity_type = Column(String, nullable=False, index=True)
    entity_id = Column(String, nullable=False, index=True)
    task_name = Column(String, nullable=False, default="sync_vector_task")
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    status = Column(String, default="pending", nullable=False)  # pending, resolved, failed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)


    def __repr__(self):
        return f"<VectorizationDLQ(id={self.id}, entity_type={self.entity_type}, entity_id={self.entity_id}, status={self.status})>"
