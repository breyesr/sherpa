"""
Category & Product models.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, ForeignKey, DateTime, Text, Float, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    category_type = Column(String, nullable=True, index=True)
    external_id = Column(String, nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_profile = relationship("BusinessProfile", back_populates="categories")
    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")

    def get_semantic_summary(self) -> str:
        summary = f"Categoría: {self.name}."
        if self.category_type: summary += f" Tipo: {self.category_type}."
        if self.description: summary += f" Descripción: {self.description}."
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
    product_type = Column(String, nullable=True, index=True)
    brand = Column(String, nullable=True, index=True)
    unit_of_measure = Column(String, nullable=True)
    external_id = Column(String, nullable=True, index=True)
    wholesale_threshold = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="products")

    def get_semantic_summary(self) -> str:
        summary = f"Producto: {self.name}."
        if self.brand: summary += f" Marca: {self.brand}."
        if self.product_type: summary += f" Tipo: {self.product_type}."
        if self.sku: summary += f" SKU: {self.sku}."
        if self.unit_of_measure: summary += f" Unidad: {self.unit_of_measure}."
        if self.price: summary += f" Precio: {self.price}."
        if self.wholesale_threshold is not None: summary += f" Umbral mayorista: {self.wholesale_threshold}."
        if self.category: summary += f" {self.category.get_semantic_summary()}"
        return summary

    def get_knowledge_metadata(self) -> dict:
        return {
            "name": self.name,
            "brand": self.brand,
            "sku": self.sku,
            "product_type": self.product_type,
            "wholesale_threshold": self.wholesale_threshold
        }
