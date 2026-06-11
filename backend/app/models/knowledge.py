from sqlalchemy import Column, String, ForeignKey, DateTime, Text, JSON, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime
from pgvector.sqlalchemy import Vector
import enum

class KnowledgeEntityType(str, enum.Enum):
    STORE = "store"
    STORE_NOTE = "store_note"
    CUSTOMER_NOTE = "customer_note"
    COMPETITOR = "competitor"
    PRODUCT = "product"
    ORDER = "order"

class KnowledgeCorpus(Base):
    __tablename__ = "knowledge_corpus"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    
    # Polymorphic Reference
    entity_type = Column(String, nullable=False, index=True) # KnowledgeEntityType
    entity_id = Column(String, nullable=False, index=True)
    
    # The actual semantic content used for embedding
    content = Column(Text, nullable=False)
    
    # Vector embedding for similarity search
    embedding = Column(Vector(1536), nullable=True)
    
    # Structured metadata for fast SQL filtering (Region, Segment, Category, etc.)
    # Example: {"region": "North", "segment": "A", "role": "Manager"}
    metadata_json = Column(JSON, nullable=True, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")

    def __repr__(self):
        return f"<KnowledgeCorpus(type={self.entity_type}, id={self.entity_id})>"

    __table_args__ = (
        # Index for scoped searches within a business
        Index('ix_knowledge_corpus_business_type', 'business_id', 'entity_type'),
    )
