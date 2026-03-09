from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from uuid_extensions import uuid7str

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True, default=uuid7str)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    business_profile = relationship("BusinessProfile", back_populates="user", uselist=False)
