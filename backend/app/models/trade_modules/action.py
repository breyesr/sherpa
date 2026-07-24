"""
StoreAction, ActionTemplate, StoreActionObjective, Competitor & CustomerNote models.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, ForeignKey, DateTime, JSON, Enum as SQLEnum, Text, Float, Integer, Date, Boolean, Numeric, Index
import enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime
from pgvector.sqlalchemy import Vector
from app.models.trade_modules.store import StoreNoteType, DataSourceType

class ActionCategory(str, enum.Enum):
    MARKETING = "MARKETING"
    COMMERCIAL = "COMMERCIAL"
    OPERATIONAL = "OPERATIONAL"

class ActionStatus(str, enum.Enum):
    PROPOSED = "proposed"
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

StoreActionCategory = ActionCategory
StoreActionStatus = ActionStatus

class StoreAction(Base):
    __tablename__ = "store_actions"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    author_id = Column(String, ForeignKey("users.id"), nullable=True)
    assigned_to_id = Column(String, ForeignKey("clients.id"), nullable=True)
    template_id = Column(String, ForeignKey("action_templates.id"), nullable=True)
    
    category = Column(SQLEnum(ActionCategory), nullable=False, index=True)
    objective = Column(String, nullable=False, index=True)
    impact_level = Column(String, nullable=True)
    note_source_id = Column(String, ForeignKey("store_notes.id"), nullable=True)
    details = Column(JSON, nullable=True, default=dict)
    
    status = Column(SQLEnum(ActionStatus), default=ActionStatus.PROPOSED, nullable=False, index=True)
    due_date = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    result_value = Column(Numeric(10, 2), nullable=True)
    result_unit = Column(String, nullable=True)
    revenue_impact = Column(Numeric(10, 2), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")
    store = relationship("Store")
    author = relationship("User", foreign_keys=[author_id])
    assigned_to = relationship("Client", foreign_keys=[assigned_to_id])
    template = relationship("ActionTemplate")
    note_source = relationship("StoreNote")

    __table_args__ = (
        Index('ix_store_actions_business_category', 'business_id', 'category'),
        Index('ix_store_actions_business_objective', 'business_id', 'objective'),
        Index('ix_store_actions_business_store_created', 'business_id', 'store_id', 'created_at'),
        Index('ix_store_actions_assigned_status', 'assigned_to_id', 'status'),
    )

    def get_semantic_summary(self) -> str:
        return f"Acción de Tienda [{self.category.value if hasattr(self.category, 'value') else self.category} - {self.objective}]: Estado {self.status.value if hasattr(self.status, 'value') else self.status}. Impacto: {self.impact_level or 'N/A'}"

    def get_knowledge_metadata(self) -> dict:
        return {
            "store_id": self.store_id,
            "category": self.category.value if hasattr(self.category, 'value') else str(self.category),
            "objective": self.objective,
            "status": self.status.value if hasattr(self.status, 'value') else str(self.status)
        }

class ActionTemplate(Base):
    __tablename__ = "action_templates"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(SQLEnum(ActionCategory), nullable=False)
    default_unit = Column(String, nullable=False, default="units")
    objective = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    details = Column(JSON, nullable=True, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")

class StoreActionObjective(Base):
    __tablename__ = "store_action_objectives"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    name = Column(String, nullable=False, index=True)
    label = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(SQLEnum(ActionCategory), nullable=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")

class Competitor(Base):
    __tablename__ = "competitors"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    store_id = Column(String, ForeignKey("stores.id"), nullable=True)
    name = Column(String, nullable=False, index=True)
    presence_level = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")
    store = relationship("Store")

    def get_semantic_summary(self) -> str:
        return f"Competidor: {self.name}. Presencia: {self.presence_level or 'N/A'}. Notas: {self.notes or 'Sin notas'}"

    def get_knowledge_metadata(self) -> dict:
        return {
            "name": self.name,
            "presence_level": self.presence_level
        }

class CustomerNote(Base):
    __tablename__ = "customer_notes"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=True)
    client_id = Column(String, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    note_type = Column(SQLEnum(StoreNoteType), nullable=False, default=StoreNoteType.GENERAL)
    content = Column(Text, nullable=False)
    is_actionable = Column(Boolean, default=False)
    data_source = Column(SQLEnum(DataSourceType), default=DataSourceType.MANUAL)
    embedding = Column(Vector(1536), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", back_populates="customer_notes")
    client = relationship("Client")
    author = relationship("User")

    def get_semantic_summary(self) -> str:
        return f"Nota de Contacto [{self.note_type.value}]: {self.content}"

    def get_knowledge_metadata(self) -> dict:
        return {
            "client_id": self.client_id,
            "note_type": self.note_type.value,
            "data_source": self.data_source.value,
            "is_actionable": self.is_actionable
        }
