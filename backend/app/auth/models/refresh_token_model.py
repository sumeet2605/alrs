# app/models/refresh_token_model.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime #type: ignore
from sqlalchemy.orm import relationship    #type: ignore
from datetime import datetime
from app.database import Base

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    jti = Column(String(128), nullable=False, unique=True, index=True)  # JWT ID
    issued_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    ip_address = Column(String(80), nullable=True)
    user_agent = Column(String(512), nullable=True)
