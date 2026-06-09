from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class LeadStage(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    FOLLOW_UP = "FOLLOW_UP"
    CONVERTED = "CONVERTED"
    CLOSED = "CLOSED"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    source = Column(String, default="whatsapp", nullable=False)
    stage = Column(Enum(LeadStage), default=LeadStage.NEW, nullable=False)
    assigned_to = Column(String, nullable=True)
    score = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
