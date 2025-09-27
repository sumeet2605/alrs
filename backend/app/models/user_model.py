from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP #type: ignore
from sqlalchemy.sql import func #type: ignore
from sqlalchemy import ForeignKey #type: ignore
from sqlalchemy.orm import relationship #type: ignore
from app.database import Base #type: ignore

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="Client")
    failed_login_attempts = Column(Integer, default=0)
    is_locked = Column(Boolean, default=False)
    lockout_until = Column(TIMESTAMP(timezone=True), nullable=True)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())

    reset_token = Column(String, nullable=True)
    reset_token_expiry = Column(TIMESTAMP(timezone=True), nullable=True)

    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    role = relationship("Role", back_populates="users")
