# app/lead/crm_service.py

from __future__ import annotations

from app.tz import now_ist, ensure_aware_in_ist
from typing import Optional, Sequence, List

from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.lead.models.lead_model import (
    Client,
    Lead,
    Package,
    AddOn,
    Session as PhotoSession,
    SessionAddOn,
    Invoice,
    Payment,
    Conversation,
    Message,
    FollowUp,
    LeadType,
    LeadSource,
    LeadStage,
    Channel,
    ConversationState,
    SenderType,
    ContentType,
    SessionType,
    SessionStatus,
    FollowUpType,
    FollowUpStatus,
    FollowUpChannel,
    FollowUpCreatedBy,
)


# -------------------------------------------------------------------
# CLIENT & LEAD HELPERS
# -------------------------------------------------------------------

def get_or_create_client(
    db: Session,
    *,
    full_name: Optional[str],
    phone: str,
    email: Optional[str] = None,
    city: Optional[str] = None,
    area: Optional[str] = None,
) -> Client:
    """
    Idempotent upsert-like helper based on phone.
    """
    client: Optional[Client] = (
        db.execute(
            select(Client).where(Client.phone == phone)
        )
        .scalars()
        .first()
    )

    if client:
        # Soft update with newly discovered info
        updated = False
        if full_name and client.full_name != full_name:
            client.full_name = full_name
            updated = True
        if email and not client.email:
            client.email = email
            updated = True
        if city and not client.city:
            client.city = city
            updated = True
        if area and not client.area:
            client.area = area
            updated = True

        if updated:
            db.add(client)
            db.commit()
            db.refresh(client)
        return client

    client = Client(
        full_name=full_name or phone,
        phone=phone,
        email=email,
        city=city,
        area=area,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def get_active_lead_for_client(
    db: Session,
    *,
    client: Client,
    source: Optional[LeadSource] = None,
) -> Optional[Lead]:
    """
    Returns the most recent 'open' lead for this client (NEW/QUALIFYING/QUALIFIED/QUOTED/TENTATIVE_BOOKING).
    """
    open_stages = [
        LeadStage.NEW,
        LeadStage.QUALIFYING,
        LeadStage.QUALIFIED,
        LeadStage.QUOTED,
        LeadStage.TENTATIVE_BOOKING,
    ]

    stmt = (
        select(Lead)
        .where(
            Lead.client_id == client.id,
            Lead.stage.in_(open_stages),
        )
        .order_by(Lead.created_at.desc())
    )

    if source:
        stmt = stmt.where(Lead.source == source)

    return db.execute(stmt).scalars().first()


def create_lead_for_client(
    db: Session,
    *,
    client: Client,
    source: LeadSource,
    source_details: Optional[str] = None,
) -> Lead:
    lead = Lead(
        client_id=client.id,
        primary_contact_name=client.full_name,
        primary_contact_phone=client.phone,
        primary_contact_email=client.email,
        source=source,
        source_details=source_details,
        stage=LeadStage.NEW,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def get_or_create_lead_for_client(
    db: Session,
    *,
    client: Client,
    source: LeadSource,
    source_details: Optional[str] = None,
) -> Lead:
    existing = get_active_lead_for_client(db, client=client, source=source)
    if existing:
        return existing
    return create_lead_for_client(db, client=client, source=source, source_details=source_details)


def update_lead_stage(
    db: Session,
    *,
    lead: Lead,
    new_stage: LeadStage,
) -> Lead:
    if lead.stage != new_stage:
        lead.stage = new_stage
        db.add(lead)
        db.commit()
        db.refresh(lead)
    return lead


def touch_lead_last_contact(
    db: Session,
    *,
    lead: Lead,
    channel: Optional[Channel] = None,
) -> Lead:
    lead.last_contacted_at = now_ist()
    if channel:
        lead.last_channel = channel
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


# -------------------------------------------------------------------
# CONVERSATION & MESSAGE HELPERS
# -------------------------------------------------------------------

def get_conversation_by_thread(
    db: Session,
    *,
    channel: Channel,
    external_thread_id: str,
) -> Optional[Conversation]:
    return (
        db.execute(
            select(Conversation).where(
                Conversation.channel == channel,
                Conversation.external_thread_id == external_thread_id,
            )
        )
        .scalars()
        .first()
    )


def get_or_create_conversation(
    db: Session,
    *,
    lead: Lead,
    channel: Channel,
    external_thread_id: str,
) -> Conversation:
    conv = get_conversation_by_thread(
        db, channel=channel, external_thread_id=external_thread_id
    )
    if conv:
        return conv

    conv = Conversation(
        lead_id=lead.id,
        channel=channel,
        external_thread_id=external_thread_id,
        current_state=ConversationState.NEW_INQUIRY,
        is_active=True,
        last_message_at=now_ist(),
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def update_conversation_state(
    db: Session,
    *,
    conversation: Conversation,
    new_state: ConversationState,
) -> Conversation:
    if conversation.current_state != new_state:
        conversation.current_state = new_state
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    return conversation


def save_inbound_message(
    db: Session,
    *,
    conversation: Conversation,
    text: str,
    external_message_id: Optional[str] = None,
    raw_payload: Optional[dict] = None,
    intent_label: Optional[str] = None,
) -> Message:
    msg = Message(
        conversation_id=conversation.id,
        sender_type=SenderType.CLIENT,
        external_message_id=external_message_id,
        content_text=text,
        content_type=ContentType.TEXT,
        raw_payload=raw_payload,
        intent_label=intent_label,
    )
    conversation.last_message_at = now_ist()
    db.add(msg)
    db.add(conversation)
    db.commit()
    db.refresh(msg)
    return msg


def save_outbound_message(
    db: Session,
    *,
    conversation: Conversation,
    text: str,
    handled_by_agent: Optional[str] = None,
) -> Message:
    msg = Message(
        conversation_id=conversation.id,
        sender_type=SenderType.AI_AGENT,
        content_text=text,
        content_type=ContentType.TEXT,
        handled_by_agent=handled_by_agent,
    )
    conversation.last_message_at = now_ist()
    db.add(msg)
    db.add(conversation)
    db.commit()
    db.refresh(msg)
    return msg


def get_primary_conversation_for_lead(
    db: Session,
    *,
    lead: Lead,
    channel: Optional[Channel] = None,
) -> Optional[Conversation]:
    stmt = select(Conversation).where(Conversation.lead_id == lead.id)

    if channel:
        stmt = stmt.where(Conversation.channel == channel)

    stmt = stmt.order_by(Conversation.last_message_at.desc().nullslast())

    return db.execute(stmt).scalars().first()


# -------------------------------------------------------------------
# PACKAGES & SESSION HELPERS
# -------------------------------------------------------------------

def get_active_packages_by_category(
    db: Session,
    *,
    category: Optional[LeadType | SessionType] = None,
) -> List[Package]:
    stmt = select(Package).where(Package.is_active.is_(True))

    if category:
        # NOTE: LeadType / SessionType names map to PackageCategory enum names
        stmt = stmt.where(Package.category == category.name)

    stmt = stmt.order_by(Package.display_order.nullslast(), Package.id.asc())
    return list(db.execute(stmt).scalars().all())


def get_or_create_tentative_session_for_lead(
    db: Session,
    *,
    lead: Lead,
    client: Client,
    session_type: SessionType,
    package: Package,
) -> PhotoSession:
    """
    One open tentative session per lead + session_type is usually enough.
    """
    existing = (
        db.execute(
            select(PhotoSession).where(
                PhotoSession.lead_id == lead.id,
                PhotoSession.session_type == session_type,
                PhotoSession.status.in_(
                    [SessionStatus.TENTATIVE, SessionStatus.CONFIRMED]
                ),
            )
        )
        .scalars()
        .first()
    )
    if existing:
        return existing

    sess = PhotoSession(
        lead_id=lead.id,
        client_id=client.id,
        package_id=package.id,
        session_type=session_type,
        status=SessionStatus.TENTATIVE,
        location_type=None,  # will be set later
        total_price=package.base_price,
        discount_amount=0,
        final_price=package.base_price,
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


def update_session_schedule_and_location(
    db: Session,
    *,
    session: PhotoSession,
    start: datetime,
    end: datetime,
    location_type,
    location_address: Optional[str] = None,
) -> PhotoSession:
    session.scheduled_start = start
    session.scheduled_end = end
    session.location_type = location_type
    session.location_address = location_address
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def confirm_session(
    db: Session,
    *,
    session: PhotoSession,
) -> PhotoSession:
    session.status = SessionStatus.CONFIRMED
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


# -------------------------------------------------------------------
# INVOICES & PAYMENTS
# -------------------------------------------------------------------

def get_or_create_invoice_for_session(
    db: Session,
    *,
    session: PhotoSession,
) -> Invoice:
    """
    Simple rule: single invoice per session for now.
    """
    existing = (
        db.execute(
            select(Invoice).where(Invoice.session_id == session.id)
        )
        .scalars()
        .first()
    )
    if existing:
        return existing

    # naive invoice number: can be replaced with a better sequence generator
    last_number = (
        db.execute(
            select(func.max(Invoice.id))
        )
        .scalars()
        .first()
    ) or 0
    invoice_number = f"ALRS-{last_number + 1:05d}"

    inv = Invoice(
        session_id=session.id,
        invoice_number=invoice_number,
        total_amount=session.final_price or session.total_price or 0,
        currency="INR",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


def record_payment(
    db: Session,
    *,
    invoice: Invoice,
    session: PhotoSession,
    amount: float,
    gateway,
    gateway_ref: Optional[str],
    payment_type,
    status,
    paid_at: Optional[datetime] = None,
) -> Payment:
    pay = Payment(
        invoice_id=invoice.id,
        session_id=session.id,
        amount=amount,
        currency=invoice.currency or "INR",
        gateway=gateway,
        gateway_ref=gateway_ref,
        type=payment_type,
        status=status,
        paid_at=paid_at or (now_ist() if status.name == "SUCCESS" else None),
    )
    db.add(pay)
    db.commit()
    db.refresh(pay)
    return pay


# -------------------------------------------------------------------
# FOLLOW-UP / NURTURE
# -------------------------------------------------------------------

def schedule_followup(
    db: Session,
    *,
    lead: Lead,
    followup_type: FollowUpType,
    channel: FollowUpChannel,
    scheduled_at: datetime,
    session: Optional[PhotoSession] = None,
    template_id: Optional[str] = None,
    created_by: FollowUpCreatedBy = FollowUpCreatedBy.AI,
) -> FollowUp:
    fu = FollowUp(
        lead_id=lead.id,
        session_id=session.id if session else None,
        type=followup_type,
        channel=channel,
        scheduled_at=scheduled_at,
        status=FollowUpStatus.SCHEDULED,
        template_id=template_id,
        created_by=created_by,
    )
    db.add(fu)
    db.commit()
    db.refresh(fu)
    return fu


def get_due_followups(
    db: Session,
    *,
    now: Optional[object] = None,
    limit: int = 100,
) -> List[FollowUp]:
    now = now or now_ist()
    stmt = (
        select(FollowUp)
        .where(
            FollowUp.status == FollowUpStatus.SCHEDULED,
            FollowUp.scheduled_at <= now,
        )
        .order_by(FollowUp.scheduled_at.asc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def mark_followup_sent(
    db: Session,
    *,
    followup: FollowUp,
) -> FollowUp:
    followup.status = FollowUpStatus.SENT
    followup.sent_at = now_ist()
    db.add(followup)
    db.commit()
    db.refresh(followup)
    return followup
