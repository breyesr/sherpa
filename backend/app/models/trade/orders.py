from datetime import datetime
import enum
from sqlalchemy import Column, String, ForeignKey, DateTime, Enum as SQLEnum, Text, Float, Integer, Date, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from app.models.trade.accounts import DataSourceType

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

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
