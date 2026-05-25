from sqlalchemy import Column, String, ForeignKey, DateTime, JSON, Enum as SQLEnum, Text
import enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class StoreNoteType(str, enum.Enum):
    RISK = "risk"
    OPPORTUNITY = "opportunity"
    ACTION = "action"
    GENERAL = "general"

class Store(Base):
    __tablename__ = "stores"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    
    name = Column(String, nullable=False, index=True)
    address = Column(String, nullable=True)
    contact_name = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    
    # Metadata for trade operations
    external_id = Column(String, nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", back_populates="stores")
    notes = relationship("StoreNote", back_populates="store", cascade="all, delete-orphan")

class StoreNote(Base):
    __tablename__ = "store_notes"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    
    type = Column(SQLEnum(StoreNoteType), default=StoreNoteType.GENERAL, nullable=False)
    content = Column(Text, nullable=False)
    
    # Optional: Author of the note (User ID)
    author_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = relationship("Store", back_populates="notes")
    author = relationship("User")
