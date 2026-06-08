from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.whatsapp.models import WhatsAppMessage
import os
import requests

router = APIRouter()

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")


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


@router.post("/admin/whatsapp/send")
def send_message(payload: dict, x_api_key: str, db: Session = Depends(get_db)):
    if not ADMIN_API_KEY or x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        raise HTTPException(status_code=500, detail="WhatsApp credentials not configured")

    to = payload.get("to")
    text = payload.get("text")

    if not to or not text:
        raise HTTPException(status_code=400, detail="'to' and 'text' are required")

    url = f"https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"

    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }

    body = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": text}
    }

    response = requests.post(url, headers=headers, json=body)

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=response.text)

    resp_json = response.json()
    wa_message_id = resp_json.get("messages", [{}])[0].get("id")

    db.add(WhatsAppMessage(
        wa_message_id=wa_message_id,
        from_number=to,
        to_number=None,
        direction="outgoing",
        message_type="text",
        message_text=text,
        status="sent",
        raw_payload=resp_json
    ))
    db.commit()

    return resp_json
