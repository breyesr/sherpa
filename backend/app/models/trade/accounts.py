from typing import Optional
from datetime import datetime
import enum
from sqlalchemy import (
    Column, String, ForeignKey, DateTime, JSON, Enum as SQLEnum,
    Text, Float, Integer, Table, Date, Index, Boolean
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str

class StoreNoteType(str, enum.Enum):
    RISK = "risk"
    OPPORTUNITY = "opportunity"
    THREAT = "threat"
    ANNIVERSARY = "anniversary"
    ACTION = "action"
    GENERAL = "general"

# Association table for Many-to-Many Store <-> Client relationship
store_clients = Table(
    "store_clients",
    Base.metadata,
    Column("store_id", String, ForeignKey("stores.id", ondelete="CASCADE"), primary_key=True),
    Column("client_id", String, ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True),
)

class DataSourceType(str, enum.Enum):
    MANUAL = "manual"
    AI_EXTRACTED = "ai_extracted"
    INTEGRATION = "integration"

class Store(Base):
    __tablename__ = "stores"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    
    name = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    # Structured address components
    street_address = Column(String, nullable=True)
    colonia = Column(String, nullable=True)
    municipality = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String(10), nullable=True, index=True)
    country = Column(String, default="México", nullable=True)
    
    # Metadata for trade operations
    market = Column(String, nullable=True, index=True)
    segment = Column(String, nullable=True, index=True)
    region = Column(String, nullable=True, index=True)
    opening_date = Column(Date, nullable=True)
    external_id = Column(String, nullable=True, index=True)
    is_prospect = Column(Boolean, default=False, nullable=False)
    prospect_segment = Column(String, default="wholesale", server_default="wholesale", nullable=False, index=True)
    delivery_zip_codes = Column(JSON, nullable=True, default=list)
    
    # Referral & Value Tracking Columns
    assigned_store_id = Column(String, ForeignKey("stores.id"), nullable=True)
    requested_product_id = Column(String, ForeignKey("products.id"), nullable=True)
    requested_quantity = Column(Integer, nullable=True)
    potential_value = Column(Float, nullable=True)
    referred_at = Column(DateTime, nullable=True)
    is_verified = Column(Boolean, default=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", back_populates="stores")
    
    # Many-to-Many relationship with Clients (Retailers)
    clients = relationship("Client", secondary=store_clients, back_populates="stores")
    
    notes = relationship("StoreNote", back_populates="store", cascade="all, delete-orphan")
    intelligence = relationship("AccountIntelligence", back_populates="store", uselist=False, cascade="all, delete-orphan")

    # Referral Relationships
    assigned_store = relationship("Store", remote_side="Store.id", backref="referred_prospects")
    requested_product = relationship("Product")

    @property
    def formatted_address(self) -> str:
        parts = [
            self.street_address,
            self.colonia,
            self.municipality,
            self.city,
            f"CP {self.zip_code}" if self.zip_code else None,
            self.state
        ]
        return ", ".join(filter(None, parts))

    @property
    def address(self) -> str:
        return self.formatted_address

    @address.setter
    def address(self, val: Optional[str]):
        if not val:
            self.street_address = None
            return
            
        import re
        parts = [p.strip() for p in val.split(",")]
        self.street_address = parts[0] if len(parts) > 0 else val
        self.city = parts[1] if len(parts) > 1 else None
        self.state = parts[2] if len(parts) > 2 else (parts[1] if len(parts) == 2 else None)
        
        # Detect ZIP
        zip_match = re.search(r"\b\d{5}\b", val)
        if zip_match:
            self.zip_code = zip_match.group(0)
            
        if self.zip_code:
            if self.city:
                self.city = re.sub(r"\(?CP\s*\d{5}\)?", "", self.city).strip()
            if self.state:
                self.state = re.sub(r"\(?CP\s*\d{5}\)?", "", self.state).strip()
            self.street_address = re.sub(r"\(?CP\s*\d{5}\)?", "", self.street_address).strip()

    def get_semantic_summary(self, include_notes: bool = False, include_contacts: bool = False) -> str:
        summary = f"Punto de Venta (Store): {self.name}."
        if self.region:
            summary += f" Región: {self.region}."
        if self.market:
            summary += f" Mercado: {self.market}."
        if self.segment:
            summary += f" Segmento: {self.segment}."
        
        addr = self.formatted_address or self.address
        if addr:
            summary += f" Dirección: {addr}."
        if self.phone:
            summary += f" Teléfono: {self.phone}."
        if self.email:
            summary += f" Email: {self.email}."
        if self.opening_date:
            summary += f" Fecha de apertura: {self.opening_date.strftime('%Y-%m-%d')}."
        
        if include_contacts and self.clients:
            contact_names = ", ".join([c.name for c in self.clients])
            summary += f" Contactos principales: {contact_names}."
            
        if include_notes and self.notes:
            # Include only the 3 most recent notes to avoid bloat
            recent_notes = " | ".join([n.note[:100] for n in self.notes[:3]])
            summary += f" Notas recientes: {recent_notes}."
            
        if self.delivery_zip_codes and isinstance(self.delivery_zip_codes, list):
            zips_str = ", ".join(str(z) for z in self.delivery_zip_codes)
            summary += f" Zona de entrega a domicilio (Códigos Postales con cobertura): {zips_str}."
            
        return summary

    def get_knowledge_metadata(self) -> dict:
        return {
            "region": self.region,
            "market": self.market,
            "segment": self.segment,
            "name": self.name,
            "state": self.state,
            "city": self.city,
            "zip_code": self.zip_code,
            "delivery_zip_codes": self.delivery_zip_codes or []
        }

    __table_args__ = (
        Index('ix_stores_business_region', 'business_id', 'region'),
        Index('ix_stores_business_market', 'business_id', 'market'),
    )

class StoreNote(Base):
    __tablename__ = "store_notes"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    
    note = Column(Text, nullable=False)
    risks = Column(Text, nullable=True)
    opportunities = Column(Text, nullable=True)
    preferred_actions = Column(Text, nullable=True)
    execution_level = Column(String, nullable=True) # e.g., 'high', 'medium', 'low'
    
    # Action Tracking & Future AI Triggers
    note_type = Column(String, nullable=False, default="general", index=True)
    is_actionable = Column(Boolean, default=False, index=True)
    
    # Provenance & Verification
    source_type = Column(SQLEnum(DataSourceType), nullable=False, default=DataSourceType.MANUAL, index=True)
    is_verified = Column(Boolean, default=True, index=True) # Defaults to True for manual, False for AI
    
    action_metadata = Column(JSON, nullable=True, default=dict)
    author_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = relationship("Store", back_populates="notes")
    author = relationship("User")

    def get_semantic_summary(self) -> str:
        summary = f"Nota de Tienda (Tipo: {self.note_type}): {self.note}."
        if self.risks:
            summary += f" Riesgos: {self.risks}."
        if self.opportunities:
            summary += f" Oportunidades: {self.opportunities}."
        if self.execution_level:
            summary += f" Nivel de Ejecución: {self.execution_level}."
        
        if self.action_metadata:
            obj = self.action_metadata.get('objective')
            out = self.action_metadata.get('outcome')
            if obj: summary += f" Objetivo: {obj}."
            if out: summary += f" Resultado: {out}."
            
        if self.is_actionable:
            summary += " Esta nota requiere seguimiento o acción inmediata."
            
        if self.store:
            summary += f" Contexto: {self.store.get_semantic_summary()}"
        return summary

    def get_knowledge_metadata(self) -> dict:
        meta = {
            "note_type": self.note_type,
            "execution_level": self.execution_level,
            "is_actionable": self.is_actionable,
            "store_id": self.store_id,
            "risks": self.risks,
            "opportunities": self.opportunities
        }
        if self.store:
            meta.update({
                "store_name": self.store.name,
                "region": self.store.region,
                "market": self.store.market,
                "segment": self.store.segment
            })
        return meta

class Competitor(Base):
    __tablename__ = "competitors"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    
    name = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    market = Column(String, nullable=True, index=True)
    region = Column(String, nullable=True, index=True)
    
    presence_level = Column(String, nullable=True) # e.g., 'high', 'low'
    notes = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)

    # Provenance & Verification
    source_type = Column(SQLEnum(DataSourceType), nullable=False, default=DataSourceType.MANUAL, index=True)
    is_verified = Column(Boolean, default=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")
    store = relationship("Store")

    def get_semantic_summary(self) -> str:
        summary = f"Competidor: {self.name}."
        if self.presence_level:
            summary += f" Nivel de Presencia: {self.presence_level}."
        if self.strengths:
            summary += f" Fortalezas: {self.strengths}."
        if self.weaknesses:
            summary += f" Debilidades: {self.weaknesses}."
        if self.store:
            summary += f" Localizado en: {self.store.name}."
        return summary

    def get_knowledge_metadata(self) -> dict:
        return {
            "presence_level": self.presence_level,
            "region": self.region,
            "market": self.market,
            "name": self.name,
            "store_id": self.store_id
        }

    __table_args__ = (
        Index('ix_competitors_business_region', 'business_id', 'region'),
        Index('ix_competitors_business_market', 'business_id', 'market'),
    )

class CustomerNote(Base):
    __tablename__ = "customer_notes"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    
    comm_style = Column(String, nullable=True) # e.g., 'direct', 'formal', 'friendly'
    visit_frequency = Column(String, nullable=True) # e.g., 'weekly', 'monthly'
    last_visit_date = Column(Date, nullable=True)
    next_visit_date = Column(Date, nullable=True)
    preferred_actions = Column(Text, nullable=True)
    general_notes = Column(Text, nullable=True)
    
    # Aligning with StoreNote for Pulse Integration
    note_type = Column(String, nullable=False, default="general", index=True)
    risks = Column(Text, nullable=True)
    opportunities = Column(Text, nullable=True)
    
    # Provenance & Verification
    source_type = Column(SQLEnum(DataSourceType), nullable=False, default=DataSourceType.MANUAL, index=True)
    is_verified = Column(Boolean, default=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")
    client = relationship("Client", back_populates="trade_notes")

    def get_semantic_summary(self) -> str:
        summary = f"Nota de Cliente: {self.general_notes or 'Sin notas generales'}."
        if self.comm_style:
            summary += f" Estilo de comunicación: {self.comm_style}."
        if self.visit_frequency:
            summary += f" Frecuencia de visita: {self.visit_frequency}."
        if self.client:
            summary += f" Relacionado con: {self.client.name} (Rol: {self.client.role})."
        return summary

    def get_knowledge_metadata(self) -> dict:
        meta = {
            "comm_style": self.comm_style,
            "visit_frequency": self.visit_frequency,
            "client_id": self.client_id,
            "store_ids": [s.id for s in self.client.stores] if self.client and hasattr(self.client, 'stores') else []
        }
        if self.client:
            meta["client_name"] = self.client.name
            meta["role"] = self.client.role
            if hasattr(self.client, 'stores') and self.client.stores:
                meta.update({
                    "regions": list(set([s.region for s in self.client.stores if s.region])),
                    "markets": list(set([s.market for s in self.client.stores if s.market])),
                    "segments": list(set([s.segment for s in self.client.stores if s.segment]))
                })
        return meta

class ClientStoreHistory(Base):
    __tablename__ = "client_store_history"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    client_id = Column(String, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    old_store_id = Column(String, ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    new_store_id = Column(String, ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    changed_by_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    client = relationship("Client")
    old_store = relationship("Store", foreign_keys=[old_store_id])
    new_store = relationship("Store", foreign_keys=[new_store_id])
    changed_by = relationship("User")
