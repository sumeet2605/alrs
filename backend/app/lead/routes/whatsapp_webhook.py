# app/lead/routes/whatsapp_webhook.py

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Request, HTTPException, Query #type: ignore
from sqlalchemy.orm import Session  #type: ignore

from app.database import get_db
from app.settings import settings
from app.lead.orchestrator import handle_incoming_message
from app.lead.models.lead_model import Channel

router = APIRouter(prefix="/webhooks/whatsapp", tags=["whatsapp-webhook"])


# ---------------------------------------------------------
# 1. VERIFY WEBHOOK (GET)
# ---------------------------------------------------------
@router.get("")
async def verify_whatsapp_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Meta (WhatsApp) calls this when you first set up the webhook.
    You must echo back hub.challenge if verify_token matches.
    """
    verify_token = settings.WHATSAPP_VERIFY_TOKEN

    if hub_mode == "subscribe" and hub_token == verify_token:
        # Return the challenge as plain text
        return hub_challenge or ""
    raise HTTPException(status_code=403, detail="Verification failed")


# ---------------------------------------------------------
# 2. RECEIVE MESSAGES (POST)
# ---------------------------------------------------------
@router.post("")
async def receive_whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Receives inbound WhatsApp messages via Meta Webhooks.
    We:
      - Extract sender phone, name, conversation id and message text
      - Call orchestrator.handle_incoming_message
      - Return 200 OK so Meta knows we processed it
    """
    payload: Dict[str, Any] = await request.json()

    # Meta can send many entry/change events; handle first message for now.
    entry = (payload.get("entry") or [None])[0]
    if not entry:
        return {"status": "ignored", "reason": "no_entry"}

    change = (entry.get("changes") or [None])[0]
    if not change:
        return {"status": "ignored", "reason": "no_changes"}

    value = change.get("value") or {}
    messages = value.get("messages") or []
    if not messages:
        # Could be a status update, etc.; just 200 OK.
        return {"status": "ignored", "reason": "no_messages"}

    message = messages[0]

    # Extract core fields from WA message
    sender_phone = message.get("from")  # WhatsApp user phone in international format
    sender_profile = message.get("profile") or {}
    sender_name = sender_profile.get("name") or None

    # Conversation/wa_id as "thread id"
    wa_business_number_id = value.get("metadata", {}).get("phone_number_id")
    external_thread_id = f"{wa_business_number_id}:{sender_phone}"

    text = extract_whatsapp_text(message)
    if not text:
        # For now, ignore non-text messages
        return {"status": "ignored", "reason": "non_text_message"}

    # Call orchestrator
    reply_text = handle_incoming_message(
        db,
        channel=Channel.WHATSAPP,
        external_thread_id=external_thread_id,
        sender_phone=sender_phone,
        sender_name=sender_name,
        text=text,
        raw_payload=payload,
        source_details=wa_business_number_id,
    )

    # NOTE:
    # Here we only return 200 OK to Meta.
    # Sending the reply back to the user must be done via
    # a separate POST to the WhatsApp Cloud API using reply_text.
    # (Put that call in a service function.)
    return {"status": "ok", "reply_preview": reply_text}


def extract_whatsapp_text(message: Dict[str, Any]) -> Optional[str]:
    """
    Extract text from a WhatsApp Cloud message object.
    Supports 'text' and 'interactive' (button/list) basic cases.
    """
    msg_type = message.get("type")
    if msg_type == "text":
        return (message.get("text") or {}).get("body")

    if msg_type == "interactive":
        interactive = message.get("interactive") or {}
        # button replies
        if interactive.get("type") == "button_reply":
            return interactive.get("button_reply", {}).get("title")
        # list replies
        if interactive.get("type") == "list_reply":
            return interactive.get("list_reply", {}).get("title")

    # fallback
    return None
