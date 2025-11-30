# app/lead/routes/instagram_webhook.py

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.settings import settings
from app.lead.orchestrator import handle_incoming_message
from app.lead.models.lead_model import Channel

router = APIRouter(prefix="/webhooks/instagram", tags=["instagram-webhook"])


# ---------------------------------------------------------
# 1. VERIFY WEBHOOK (GET)
# ---------------------------------------------------------
@router.get("")
async def verify_instagram_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Meta calls this when you set up the Instagram webhook.
    Echo back hub.challenge if verify_token matches.
    """
    verify_token = settings.INSTAGRAM_VERIFY_TOKEN

    if hub_mode == "subscribe" and hub_token == verify_token:
        return hub_challenge or ""
    raise HTTPException(status_code=403, detail="Verification failed")


# ---------------------------------------------------------
# 2. RECEIVE MESSAGES (POST)
# ---------------------------------------------------------
@router.post("")
async def receive_instagram_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Receives inbound Instagram DMs via Meta Webhooks.
    """
    payload: Dict[str, Any] = await request.json()

    entry = (payload.get("entry") or [None])[0]
    if not entry:
        return {"status": "ignored", "reason": "no_entry"}

    # For IG, changes may look like messaging-related events
    change = (entry.get("changes") or [None])[0]
    if not change:
        return {"status": "ignored", "reason": "no_changes"}

    value = change.get("value") or {}

    # Typical structure: value["messaging"][0]
    messaging = (value.get("messaging") or [None])[0]
    if not messaging:
        return {"status": "ignored", "reason": "no_messaging"}

    sender = messaging.get("sender") or {}
    recipient = messaging.get("recipient") or {}
    message = messaging.get("message") or {}

    sender_id = sender.get("id")  # IG PSID
    page_id = recipient.get("id")  # your IG business account/page id
    external_thread_id = f"{page_id}:{sender_id}"

    text = extract_instagram_text(message)
    if not text:
        return {"status": "ignored", "reason": "non_text_message"}

    # IG doesn't give us phone; treat PSID as "virtual phone"
    sender_phone = sender_id
    # You might later resolve sender name via IG Graph API; for now None:
    sender_name = None

    reply_text = handle_incoming_message(
        db,
        channel=Channel.INSTAGRAM,
        external_thread_id=external_thread_id,
        sender_phone=sender_phone,
        sender_name=sender_name,
        text=text,
        raw_payload=payload,
        source_details=page_id,
    )

    # As with WhatsApp, you must send reply_text back to IG using the
    # appropriate Meta Graph API call separately.
    return {"status": "ok", "reply_preview": reply_text}


def extract_instagram_text(message: Dict[str, Any]) -> Optional[str]:
    """
    Extract basic text from an Instagram DM messaging payload.
    """
    if "text" in message:
        # Some payloads use: {"text": {"body": "hi"}}
        if isinstance(message["text"], dict):
            return message["text"].get("body")
        # Some use: {"text": "hi"}
        if isinstance(message["text"], str):
            return message["text"]

    if "message" in message and isinstance(message["message"], str):
        return message["message"]

    return None
