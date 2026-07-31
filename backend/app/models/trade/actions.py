from datetime import datetime
import enum
from sqlalchemy import Column, String, ForeignKey, DateTime, Enum as SQLEnum, Text, Numeric, JSON, Integer, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str

class ActionCategory(str, enum.Enum):
    MARKETING = "MARKETING"
    COMMERCIAL = "COMMERCIAL"

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

class ActionStatus(str, enum.Enum):
    PROPOSED = "proposed"
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ActionTemplate(Base):
    __tablename__ = "action_templates"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    
    name = Column(String, nullable=False)
    category = Column(SQLEnum(ActionCategory), nullable=False, index=True)
    default_unit = Column(String, nullable=False) # e.g. "exchanges", "participants"
    objective = Column(String, nullable=True, index=True)
    description = Column(Text, nullable=True)
    details = Column(JSON, nullable=True, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")

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
    
    # Execution & Results Columns
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

class AccountIntelligence(Base):
    """
    The 'Fat Table' for pre-calculated Account Dossiers (Epic 107).
    Stores synthesized strategy, playbooks, and triggers for instant retrieval.
    """
    __tablename__ = "account_intelligence"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False, unique=True)
    
    # The full synthesized dossier (Vital Signs, Matrix, Threats, Triggers)
    dossier_json = Column(JSON, nullable=True, default=dict)
    
    # Performance & Freshness tracking
    version = Column(Integer, default=1)
    last_synthesized_at = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")
    store = relationship("Store", back_populates="intelligence")

    def get_semantic_summary(self) -> str:
        """Convert the dossier JSON into a readable summary for vectorization."""
        d = self.dossier_json or {}
        summary = [f"Resumen de Inteligencia para la cuenta: {getattr(self.store, 'name', 'Desconocida')}"]
        
        # If the dossier has a 'content' key (Markdown), use it as the primary summary
        if "content" in d:
            summary.append(d["content"])

        # Vital Signs
        if "vital_signs" in d:
            vs = d["vital_signs"]
            summary.append(f"Estado: {vs.get('status', 'N/A')}. Salud: {vs.get('health_score', 'N/A')}/10.")
        
        # Playbook
        if "playbook" in d:
            p = d["playbook"]
            summary.append(f"Estrategia Comercial: {p.get('commercial_strategy', 'N/A')}")
            summary.append(f"Playbook de Ventas: {p.get('sales_playbook', 'N/A')}")
        
        # Triggers & Threats
        if "threats" in d:
            summary.append(f"Amenazas Detectadas: {', '.join(d['threats'])}")
        
        if "triggers" in d:
            summary.append(f"Triggers Activos: {', '.join(d['triggers'])}")

        return "\n".join(summary)

    def get_knowledge_metadata(self) -> dict:
        """Return metadata for filtering."""
        return {
            "store_id": self.store_id,
            "version": self.version,
            "last_synthesized": self.last_synthesized_at.isoformat() if self.last_synthesized_at else None,
            "region": getattr(self.store, 'region', None),
            "segment": getattr(self.store, 'segment', None)
        }

    __table_args__ = (
        Index('ix_account_intel_business_store', 'business_id', 'store_id'),
    )
