from sqlalchemy import Column, Integer, String, TIMESTAMP, Text, JSON
from sqlalchemy.sql import func
from app.database import Base


class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(Integer, primary_key=True, index=True)
    wa_message_id = Column(String(100), index=True)
    from_number = Column(String(20), index=True)
    to_number = Column(String(20))
    direction = Column(String(20))  # incoming / outgoing / status
    message_type = Column(String(50), nullable=True)
    message_text = Column(Text, nullable=True)
    status = Column(String(20), nullable=True)
    raw_payload = Column(JSON)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
