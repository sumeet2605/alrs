from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.whatsapp.models import WhatsAppMessage
import os

router = APIRouter()

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/admin/whatsapp/conversations")
def get_conversations(x_api_key: str, db: Session = Depends(get_db)):
    if not ADMIN_API_KEY or x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")

    conversations = (
        db.query(
            WhatsAppMessage.from_number,
            func.max(WhatsAppMessage.created_at).label("last_message_time")
        )
        .filter(WhatsAppMessage.direction == "incoming")
        .group_by(WhatsAppMessage.from_number)
        .order_by(func.max(WhatsAppMessage.created_at).desc())
        .all()
    )

    return [
        {
            "phone": convo[0],
            "last_message_time": convo[1]
        }
        for convo in conversations
    ]


@router.get("/admin/whatsapp/messages/{phone}")
def get_messages(phone: str, x_api_key: str, db: Session = Depends(get_db)):
    if not ADMIN_API_KEY or x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")

    messages = (
        db.query(WhatsAppMessage)
        .filter(
            (WhatsAppMessage.from_number == phone)
        )
        .order_by(WhatsAppMessage.created_at.asc())
        .all()
    )

    return [
        {
            "id": msg.id,
            "wa_message_id": msg.wa_message_id,
            "direction": msg.direction,
            "type": msg.message_type,
            "text": msg.message_text,
            "status": msg.status,
            "timestamp": msg.created_at
        }
        for msg in messages
    ]
