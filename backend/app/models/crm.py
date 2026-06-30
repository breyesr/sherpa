from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, UniqueConstraint, JSON, Index, Date
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime
from pgvector.sqlalchemy import Vector
import hashlib

import hashlib
import re
from sqlalchemy import event

class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True, index=True)
    email = Column(String, nullable=True)
    role = Column(String, nullable=True)
    birthday = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    
    # Flexible custom fields (Epic 13)
    custom_fields = Column(JSON, nullable=True, default=dict)
    
    # External Messaging IDs (Encrypted at rest)
    telegram_id = Column(String, nullable=True)
    whatsapp_id = Column(String, nullable=True)
    
    # Vector embedding for GraphRAG
    embedding = Column(Vector(1536), nullable=True)
    
    # Searchable Hashes (Blind Indexes for privacy-preserving search)
    telegram_id_hash = Column(String, nullable=True, index=True)
    whatsapp_id_hash = Column(String, nullable=True, index=True)
    is_prospect = Column(Boolean, default=False, nullable=False)
    prospect_segment = Column(String, default="wholesale", server_default="wholesale", nullable=False, index=True)
    whatsapp_opt_in = Column(Boolean, default=False, nullable=False)
    whatsapp_opt_in_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('business_id', 'telegram_id_hash', name='_business_telegram_hash_uc'),
        UniqueConstraint('business_id', 'whatsapp_id_hash', name='_business_whatsapp_hash_uc'),
    )

    business_profile = relationship("BusinessProfile", back_populates="clients")
    appointments = relationship("Appointment", back_populates="client", cascade="all, delete-orphan")
    trade_notes = relationship("CustomerNote", back_populates="client", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="client", cascade="all, delete-orphan")
    stores = relationship("Store", secondary="store_clients", back_populates="clients")

    def get_semantic_summary(self, include_notes: bool = False) -> str:
        summary = f"Cliente (Contacto): {self.name}."
        if self.role:
            summary += f" Rol/Cargo: {self.role}."
        
        if include_notes and self.trade_notes:
            # Include latest trade note context
            latest_note = self.trade_notes[-1]
            summary += f" Contexto Comercial: {latest_note.general_notes[:150]}"
            if latest_note.comm_style:
                summary += f" (Estilo: {latest_note.comm_style})"
                
        return summary

    def get_knowledge_metadata(self) -> dict:
        meta = {
            "name": self.name,
            "role": self.role,
            "client_id": self.id,
            "store_ids": [s.id for s in self.stores] if hasattr(self, 'stores') else []
        }
        if hasattr(self, 'stores') and self.stores:
            meta.update({
                "regions": list(set([s.region for s in self.stores if s.region])),
                "markets": list(set([s.market for s in self.stores if s.market])),
                "segments": list(set([s.segment for s in self.stores if s.segment]))
            })
        return meta

    @staticmethod
    def normalize_id(id_val: str) -> str:
        if not id_val:
            return None
        # Remove all non-alphanumeric characters (keeps only digits and letters)
        # This makes +1 234-567 and 1234567 identical for hashing
        return re.sub(r'[^a-zA-Z0-9]', '', str(id_val))

    @staticmethod
    def hash_id(id_val: str) -> str:
        normalized = Client.normalize_id(id_val)
        if not normalized:
            return None
        return hashlib.sha256(normalized.encode()).hexdigest()

# Auto-populate hashes and normalize data on save
@event.listens_for(Client, 'before_insert')
@event.listens_for(Client, 'before_update')
def receive_before_save(mapper, connection, target):
    from app.core.security import encrypt_token, decrypt_token
    
    # 1. Always normalize the Phone number
    if target.phone:
        target.phone = Client.normalize_id(target.phone)
        # If we have a phone but no WhatsApp hash, generate it from the phone
        if not target.whatsapp_id_hash:
            target.whatsapp_id_hash = Client.hash_id(target.phone)
            target.whatsapp_id = encrypt_token(target.phone)
    
    # 2. Synchronize Telegram IDs and Hashes
    if target.telegram_id:
        # If it's a raw ID (not yet encrypted), normalize and hash it
        if not target.telegram_id.startswith("gAAAA"):
            raw_tg = Client.normalize_id(target.telegram_id)
            target.telegram_id_hash = Client.hash_id(raw_tg)
            target.telegram_id = encrypt_token(raw_tg)
        # If it IS encrypted but hash is missing, we must decrypt to hash it
        elif not target.telegram_id_hash:
            raw_tg = Client.normalize_id(decrypt_token(target.telegram_id))
            target.telegram_id_hash = Client.hash_id(raw_tg)

    # 3. Synchronize WhatsApp IDs and Hashes
    if target.whatsapp_id:
        if not target.whatsapp_id.startswith("gAAAA"):
            raw_wa = Client.normalize_id(target.whatsapp_id)
            target.whatsapp_id_hash = Client.hash_id(raw_wa)
            target.whatsapp_id = encrypt_token(raw_wa)
        elif not target.whatsapp_id_hash:
            raw_wa = Client.normalize_id(decrypt_token(target.whatsapp_id))
            target.whatsapp_id_hash = Client.hash_id(raw_wa)

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    client_id = Column(String, ForeignKey("clients.id"), nullable=True) # Optional for B2B
    # Removed store_id and customer_id from here to avoid circularity with Trade vertical
    service_id = Column(String, ForeignKey("services.id"), nullable=True)

    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(String, default="scheduled") # scheduled, confirmed, cancelled, completed
    reminder_sent = Column(Boolean, default=False)
    notes = Column(String, nullable=True) # Reason for booking

    # Link to Google Calendar event if synced
    google_event_id = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", back_populates="appointments")
    client = relationship("Client", back_populates="appointments")
    service = relationship("Service", back_populates="appointments")


    __table_args__ = (
        Index('ix_appointments_business_id_start_time', 'business_id', 'start_time'),
    )
