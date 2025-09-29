# app/models/login_audit_model.py
from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, Boolean #type: ignore
from sqlalchemy.sql import func #type: ignore
from sqlalchemy.orm import relationship #type: ignore
from app.database import Base

class LoginAudit(Base):
    """Represents a login audit record."""
    __tablename__ = "login_audits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(TIMESTAMP(timezone=True), server_default=func.now())
    is_successful = Column(Boolean, nullable=False)
    
    user = relationship("User")