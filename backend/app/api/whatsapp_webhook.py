from fastapi import APIRouter, Request, HTTPException
from app.database import SessionLocal
from app.whatsapp.models import WhatsAppMessage
import os

router = APIRouter()

VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN")


@router.get("/webhook/whatsapp")
async def verify_webhook(request: Request):
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        return int(challenge)

    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook/whatsapp")
async def receive_message(request: Request):
    payload = await request.json()
    db = SessionLocal()

    try:
        entry = payload.get("entry", [])
        for item in entry:
            changes = item.get("changes", [])
            for change in changes:
                value = change.get("value", {})

                # Incoming messages
                messages = value.get("messages", [])
                for msg in messages:
                    db.add(WhatsAppMessage(
                        wa_message_id=msg.get("id"),
                        from_number=msg.get("from"),
                        to_number=value.get("metadata", {}).get("display_phone_number"),
                        direction="incoming",
                        message_type=msg.get("type"),
                        message_text=msg.get("text", {}).get("body"),
                        raw_payload=payload
                    ))

                # Status updates
                statuses = value.get("statuses", [])
                for status in statuses:
                    db.add(WhatsAppMessage(
                        wa_message_id=status.get("id"),
                        from_number=status.get("recipient_id"),
                        direction="status",
                        status=status.get("status"),
                        raw_payload=payload
                    ))

        db.commit()
    finally:
        db.close()

    return {"status": "received"}
