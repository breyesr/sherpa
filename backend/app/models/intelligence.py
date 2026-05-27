from sqlalchemy import Column, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime
from pgvector.sqlalchemy import Vector

class StoreNote(Base):
    __tablename__ = "store_notes"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    
    note = Column(Text, nullable=False)
    risks = Column(Text, nullable=True)
    opportunities = Column(Text, nullable=True)
    preferred_actions = Column(Text, nullable=True)
    
    # Vector embedding for GraphRAG (1536 is OpenAI standard)
    embedding = Column(Vector(1536), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="notes")

class CustomerNote(Base):
    __tablename__ = "customer_notes"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    
    note = Column(Text, nullable=False)
    comm_style = Column(String, nullable=True)
    
    # Vector embedding for GraphRAG
    embedding = Column(Vector(1536), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="notes")

class Competitor(Base):
    __tablename__ = "competitors"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    
    name = Column(String, nullable=False)
    market_share = Column(String, nullable=True)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="competitors")
