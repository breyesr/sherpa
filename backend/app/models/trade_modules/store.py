"""
Store, StoreNote, AccountIntelligence & PostalCode models.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, ForeignKey, DateTime, JSON, Enum as SQLEnum, Text, Float, Integer, Table, Date, Index, Boolean
import enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime
from pgvector.sqlalchemy import Vector

class StoreNoteType(str, enum.Enum):
    RISK = "risk"
    OPPORTUNITY = "opportunity"
    THREAT = "threat"
    ANNIVERSARY = "anniversary"
    ACTION = "action"
    GENERAL = "general"

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

class PostalCode(Base):
    __tablename__ = "postal_codes"

    id = Column(Integer, primary_key=True, index=True)
    zip_code = Column(String(10), index=True, nullable=False)
    colonia = Column(String, nullable=False)
    municipality = Column(String, nullable=False)
    city = Column(String, nullable=True)
    state = Column(String, nullable=False)

class Store(Base):
    __tablename__ = "stores"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    
    name = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    street_address = Column(String, nullable=True)
    colonia = Column(String, nullable=True)
    municipality = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String(10), nullable=True, index=True)
    country = Column(String, default="México", nullable=True)
    
    market = Column(String, nullable=True, index=True)
    segment = Column(String, nullable=True, index=True)
    region = Column(String, nullable=True, index=True)
    opening_date = Column(Date, nullable=True)
    external_id = Column(String, nullable=True, index=True)
    is_prospect = Column(Boolean, default=False, nullable=False)
    prospect_segment = Column(String, default="wholesale", server_default="wholesale", nullable=False, index=True)
    delivery_zip_codes = Column(JSON, nullable=True, default=list)
    
    assigned_store_id = Column(String, ForeignKey("stores.id"), nullable=True)
    requested_product_id = Column(String, ForeignKey("products.id"), nullable=True)
    requested_quantity = Column(Integer, nullable=True)
    potential_value = Column(Float, nullable=True)
    referred_at = Column(DateTime, nullable=True)
    is_verified = Column(Boolean, default=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", back_populates="stores")
    clients = relationship("Client", secondary=store_clients, back_populates="stores")
    notes = relationship("StoreNote", back_populates="store", cascade="all, delete-orphan")
    intelligence = relationship("AccountIntelligence", back_populates="store", uselist=False, cascade="all, delete-orphan")
    assigned_store = relationship("Store", remote_side="Store.id", backref="referred_prospects")
    requested_product = relationship("Product")

    @property
    def full_address(self) -> str:
        parts = [p for p in [self.street_address, self.colonia, self.municipality, self.city, self.state, self.zip_code, self.country] if p]
        return ", ".join(parts) if parts else "Sin dirección registrada"

    def get_semantic_summary(self) -> str:
        summary = f"Punto de Venta (Store): {self.name}."
        if self.region: summary += f" Región: {self.region}."
        if self.market: summary += f" Mercado: {self.market}."
        if self.segment: summary += f" Segmento: {self.segment}."
        if self.full_address: summary += f" Dirección: {self.full_address}."
        if self.phone: summary += f" Teléfono: {self.phone}."
        if self.email: summary += f" Email: {self.email}."
        if self.delivery_zip_codes and isinstance(self.delivery_zip_codes, list):
            zips_str = ", ".join(str(z) for z in self.delivery_zip_codes)
            summary += f" Zona de entrega a domicilio (Códigos Postales con cobertura): {zips_str}."
        if self.clients:
            client_names = [c.name for c in self.clients if c.name]
            if client_names: summary += f" Contactos Asociados: {', '.join(client_names)}."
        return summary

    def get_knowledge_metadata(self) -> dict:
        return {
            "name": self.name,
            "market": self.market,
            "segment": self.segment,
            "region": self.region,
            "external_id": self.external_id,
            "zip_code": self.zip_code,
            "colonia": self.colonia,
            "municipality": self.municipality,
            "city": self.city,
            "state": self.state,
            "delivery_zip_codes": self.delivery_zip_codes or []
        }

class StoreNote(Base):
    __tablename__ = "store_notes"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    store_id = Column(String, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    note_type = Column(SQLEnum(StoreNoteType), nullable=False, default=StoreNoteType.GENERAL)
    content = Column(Text, nullable=False)
    is_actionable = Column(Boolean, default=False)
    
    data_source = Column(SQLEnum(DataSourceType), default=DataSourceType.MANUAL)
    raw_audio_url = Column(String, nullable=True)
    embedding = Column(Vector(1536), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = relationship("Store", back_populates="notes")
    author = relationship("User")

    def get_semantic_summary(self) -> str:
        return f"Nota de Tienda [{self.note_type.value}]: {self.content}"

    def get_knowledge_metadata(self) -> dict:
        return {
            "store_id": self.store_id,
            "note_type": self.note_type.value,
            "data_source": self.data_source.value,
            "is_actionable": self.is_actionable
        }

class AccountIntelligence(Base):
    __tablename__ = "account_intelligence"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    store_id = Column(String, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    summary = Column(Text, nullable=True)
    key_contacts = Column(JSON, nullable=True)
    pain_points = Column(JSON, nullable=True)
    growth_opportunities = Column(JSON, nullable=True)
    competitive_threats = Column(JSON, nullable=True)
    visit_frequency_days = Column(Integer, default=14)
    last_visit_date = Column(DateTime, nullable=True)
    next_recommended_visit = Column(DateTime, nullable=True)
    health_score = Column(Float, default=100.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = relationship("Store", back_populates="intelligence")

    def get_semantic_summary(self) -> str:
        summary = f"Inteligencia de Cuenta para Tienda {self.store_id}."
        if self.summary: summary += f" Resumen: {self.summary}."
        if self.health_score: summary += f" Health Score: {self.health_score}."
        return summary

    def get_knowledge_metadata(self) -> dict:
        return {
            "store_id": self.store_id,
            "health_score": self.health_score,
            "last_visit_date": self.last_visit_date.isoformat() if self.last_visit_date else None
        }
