"""
Order & OrderItem models.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, ForeignKey, DateTime, Enum as SQLEnum, Float, Integer, Numeric, Boolean, Date, Text
import enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime
from app.models.trade_modules.store import DataSourceType

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
    client_id = Column(String, ForeignKey("clients.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    order_number = Column(String, nullable=True, index=True)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    order_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(Text, nullable=True)
    source_type = Column(SQLEnum(DataSourceType), nullable=False, default=DataSourceType.MANUAL, index=True)
    is_verified = Column(Boolean, default=True, index=True)
    
    delivery_id = Column(String, nullable=True, index=True)
    delivery_date = Column(Date, nullable=True)
    payment_method = Column(String, nullable=True)
    shipping_address = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile")
    store = relationship("Store")
    client = relationship("Client")
    user = relationship("User")
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
        return {
            "order_id": self.id,
            "order_number": self.order_number,
            "status": self.status.value if hasattr(self.status, 'value') else str(self.status),
            "total_amount": float(self.total_amount) if self.total_amount else 0.0,
            "store_id": self.store_id
        }

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    order_id = Column(String, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, default=0.0)
    subtotal = Column(Float, nullable=False, default=0.0)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
