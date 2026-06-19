from sqlalchemy import Column, String, ForeignKey, DateTime, JSON, Enum as SQLEnum, Text, Float, Integer, Table, Date, Index, Boolean, Numeric
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

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Draft Hardening Fields
    category_type = Column(String, nullable=True, index=True) # e.g., 'Beverage', 'Snack'
    external_id = Column(String, nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", back_populates="categories")
    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")

    def get_semantic_summary(self) -> str:
        summary = f"Categoría: {self.name}."
        if self.category_type:
            summary += f" Tipo: {self.category_type}."
        if self.description:
            summary += f" Descripción: {self.description}."
        return summary

    def get_knowledge_metadata(self) -> dict:
        return {
            "name": self.name,
            "category_type": self.category_type,
            "external_id": self.external_id
        }

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    sku = Column(String, nullable=True, index=True)
    
    # Draft Hardening Fields
    product_type = Column(String, nullable=True, index=True)
    brand = Column(String, nullable=True, index=True)
    unit_of_measure = Column(String, nullable=True) # e.g., 'kg', 'unit', 'box'
    external_id = Column(String, nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="products")

    def get_semantic_summary(self) -> str:
        summary = f"Producto: {self.name}."
        if self.brand:
            summary += f" Marca: {self.brand}."
        if self.product_type:
            summary += f" Tipo: {self.product_type}."
        if self.sku:
            summary += f" SKU: {self.sku}."
        if self.unit_of_measure:
            summary += f" Unidad: {self.unit_of_measure}."
        if self.price:
            summary += f" Precio: {self.price}."
        if self.category:
            summary += f" {self.category.get_semantic_summary()}"
        return summary

    def get_knowledge_metadata(self) -> dict:
        return {
            "name": self.name,
            "brand": self.brand,
            "sku": self.sku,
            "product_type": self.product_type
        }

class Store(Base):
    __tablename__ = "stores"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    
    name = Column(String, nullable=False, index=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    # Metadata for trade operations
    market = Column(String, nullable=True, index=True)
    segment = Column(String, nullable=True, index=True)
    region = Column(String, nullable=True, index=True)
    opening_date = Column(Date, nullable=True)
    external_id = Column(String, nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", back_populates="stores")
    
    # Many-to-Many relationship with Clients (Retailers)
    clients = relationship("Client", secondary=store_clients, backref="stores")
    
    notes = relationship("StoreNote", back_populates="store", cascade="all, delete-orphan")
    intelligence = relationship("AccountIntelligence", back_populates="store", uselist=False, cascade="all, delete-orphan")

    def get_semantic_summary(self, include_notes: bool = False, include_contacts: bool = False) -> str:
        summary = f"Punto de Venta (Store): {self.name}."
        if self.region:
            summary += f" Región: {self.region}."
        if self.market:
            summary += f" Mercado: {self.market}."
        if self.segment:
            summary += f" Segmento: {self.segment}."
        if self.address:
            summary += f" Dirección: {self.address}."
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
            
        return summary

    def get_knowledge_metadata(self) -> dict:
        return {
            "region": self.region,
            "market": self.market,
            "segment": self.segment,
            "name": self.name
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
    # note_type: 'general', 'marketing', 'commercial', 'threat', 'anniversary'
    note_type = Column(String, nullable=False, default="general", index=True)
    is_actionable = Column(Boolean, default=False, index=True)
    
    # Provenance & Verification
    source_type = Column(SQLEnum(DataSourceType), nullable=False, default=DataSourceType.MANUAL, index=True)
    is_verified = Column(Boolean, default=True, index=True) # Defaults to True for manual, False for AI
    
    # Structured metadata for the "Active AI" to eventually digest
    # Stores: { "objective": "...", "outcome": "...", "items_requested": [...], "competitor_move": "..." }
    action_metadata = Column(JSON, nullable=True, default=dict)
    
    # Optional: Author of the note (User ID)
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

class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    client_id = Column(String, ForeignKey("clients.id"), nullable=True) # Linked to Customer
    
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    total_amount = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True)
    
    # Provenance & Verification
    source_type = Column(SQLEnum(DataSourceType), nullable=False, default=DataSourceType.MANUAL, index=True)
    is_verified = Column(Boolean, default=True, index=True)
    
    # Draft Hardening Fields
    delivery_id = Column(String, nullable=True, index=True)
    delivery_date = Column(Date, nullable=True)
    payment_method = Column(String, nullable=True)
    shipping_address = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")
    store = relationship("Store")
    client = relationship("Client")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def get_semantic_summary(self) -> str:
        summary = f"Orden ID: {self.id}. Estado: {self.status}. Total: {self.total_amount}."
        if self.delivery_id:
            summary += f" ID Entrega: {self.delivery_id}."
        if self.store:
            summary += f" Tienda: {self.store.name}."
        if self.client:
            summary += f" Cliente: {self.client.name}."
        return summary

    def get_knowledge_metadata(self) -> dict:
        meta = {
            "status": self.status.value if hasattr(self.status, 'value') else self.status,
            "total_amount": self.total_amount,
            "delivery_id": self.delivery_id
        }
        if self.store:
            meta["store_name"] = self.store.name
        if self.client:
            meta["client_name"] = self.client.name
        return meta

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")

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

class ActionCategory(str, enum.Enum):
    MARKETING = "MARKETING"
    COMMERCIAL = "COMMERCIAL"

class ActionObjective(str, enum.Enum):
    THREAT_RESPONSE = "THREAT_RESPONSE"
    ANNIVERSARY = "ANNIVERSARY"
    REPLENISHMENT = "REPLENISHMENT"
    NEW_PRODUCT = "NEW_PRODUCT"
    RELATIONSHIP = "RELATIONSHIP"
    GENERAL = "GENERAL"

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
    description = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")

class StoreAction(Base):
    __tablename__ = "store_actions"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    author_id = Column(String, ForeignKey("users.id"), nullable=True)
    assigned_to_id = Column(String, ForeignKey("users.id"), nullable=True)
    template_id = Column(String, ForeignKey("action_templates.id"), nullable=True)
    
    category = Column(SQLEnum(ActionCategory), nullable=False, index=True)
    objective = Column(SQLEnum(ActionObjective), nullable=False, index=True)
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
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
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



