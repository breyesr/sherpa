from sqlalchemy import Column, String, ForeignKey, Date, DateTime, Float, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str
from datetime import datetime

class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    business_id = Column(String, ForeignKey("business_profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=True) # e.g. Plumbing, Electrical
    
    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    name = Column(String, nullable=False)
    sku = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    
    orders = relationship("Order", back_populates="product")
    category = relationship("Category", back_populates="products")

class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    
    quantity = Column(Integer, default=1)
    total_price = Column(Float, nullable=True)
    order_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending") # pending, delivered, cancelled

    product = relationship("Product", back_populates="orders")
