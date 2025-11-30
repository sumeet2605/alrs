# app/lead/orchestrator.py

from __future__ import annotations

from datetime import datetime
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.lead.services.crm_service import (
    get_or_create_client,
    get_or_create_lead_for_client,
    get_or_create_conversation,
    save_inbound_message,
    save_outbound_message,
    update_lead_stage,
    update_conversation_state,
    touch_lead_last_contact,
    get_active_packages_by_category,
    get_or_create_tentative_session_for_lead,
    get_or_create_invoice_for_session,
    schedule_followup,
)

from app.lead.models.lead_model import (
    Client,
    Lead,
    Package,
    Session as PhotoSession,
    LeadType,
    LeadSource,
    LeadStage,
    Channel,
    Conversation,
    ConversationState,
    SessionType,
    SessionStatus,
    FollowUpType,
    FollowUpChannel,
    FollowUpCreatedBy,
    LocationType,
)


# -------------------------------------------------------------------
# 1. INTENT CLASSIFICATION (RULE-BASED FOR NOW)
# -------------------------------------------------------------------

def classify_intent(text: str) -> str:
    """
    Very simple keyword-based intent classifier.
    You can later replace this with an LLM call.
    Returns a string label like 'price_query', 'booking_interest', etc.
    """
    t = (text or "").lower().strip()

    if not t:
        return "empty"

    # Price / package enquiry
    price_keywords = ["price", "charges", "rate", "cost", "package", "packages"]
    if any(k in t for k in price_keywords):
        return "price_query"

    # Booking interest
    booking_keywords = ["book", "booking", "confirm", "slot", "reserve"]
    if any(k in t for k in booking_keywords):
        return "booking_interest"

    # Date / time / slot questions
    schedule_keywords = ["date", "time", "availability", "available", "when"]
    if any(k in t for k in schedule_keywords):
        return "slot_request"

    # Objections
    cheap_keywords = ["too expensive", "costly", "budget", "less", "discount"]
    if any(k in t for k in cheap_keywords):
        return "price_objection"

    wait_keywords = ["later", "will think", "need to discuss", "not sure"]
    if any(k in t for k in wait_keywords):
        return "stalling"

    # Greetings / general enquiry
    greet_keywords = ["hi", "hello", "hey", "good morning", "good evening"]
    if any(t.startswith(k) for k in greet_keywords):
        return "greeting"

    # Generic fallback
    return "general_enquiry"


# -------------------------------------------------------------------
# 2. STATE DECISION LOGIC
# -------------------------------------------------------------------

def decide_next_state(
    conversation: Conversation,
    lead: Lead,
    intent: str,
) -> ConversationState:
    """
    Decides which high-level state the orchestrator should go to,
    based on lead stage, current conversation state and intent.
    """
    # If lead is brand new / not qualified
    if lead.stage in (LeadStage.NEW, LeadStage.QUALIFYING, None):
        if intent in ("price_query", "greeting", "general_enquiry", "empty"):
            return ConversationState.QUALIFYING

    # During qualification - once we have enough info, we can recommend packages
    if lead.stage in (LeadStage.QUALIFYING, LeadStage.QUALIFIED):
        if is_lead_profile_sufficient_for_packages(lead):
            return ConversationState.PACKAGE_RECOMMENDATION
        else:
            return ConversationState.QUALIFYING

    # After quoting
    if lead.stage in (LeadStage.QUALIFIED, LeadStage.QUOTED):
        if intent in ("booking_interest", "slot_request"):
            return ConversationState.BOOKING
        if intent == "price_objection":
            return ConversationState.OBJECTION
        # remain in package recommendation if they keep asking about details
        return conversation.current_state or ConversationState.PACKAGE_RECOMMENDATION

    # Tentative booking
    if lead.stage == LeadStage.TENTATIVE_BOOKING:
        if intent in ("booking_interest", "slot_request"):
            return ConversationState.BOOKING
        return conversation.current_state or ConversationState.BOOKING

    # After booked
    if lead.stage in (LeadStage.BOOKED, LeadStage.SHOT, LeadStage.DELIVERED):
        # For now, keep them in post-booking pre-shoot
        return ConversationState.POST_BOOKING_PRE_SHOOT

    # Fallback
    return conversation.current_state or ConversationState.NEW_INQUIRY


def is_lead_profile_sufficient_for_packages(lead: Lead) -> bool:
    """
    Simple rule: we can recommend packages if we know lead_type.
    (Optionally expand with due_date / baby_age / location later.)
    """
    if not lead.lead_type:
        return False
    # Additional rules can be added here
    return True


# -------------------------------------------------------------------
# 3. HIGH-LEVEL ORCHESTRATOR ENTRYPOINT
# -------------------------------------------------------------------

def handle_incoming_message(
    db: Session,
    *,
    channel: Channel,
    external_thread_id: str,
    sender_phone: str,
    sender_name: Optional[str],
    text: str,
    raw_payload: Optional[dict] = None,
    source_details: Optional[str] = None,
) -> str:
    """
    Main entrypoint for WhatsApp/Instagram webhook handler.

    - Ensures client, lead, conversation exist
    - Classifies intent
    - Chooses next state
    - Calls the appropriate 'agent'
    - Stores outbound message
    - Returns the reply text (to be sent via WA/IG)
    """

    # 1. Map channel -> LeadSource
    lead_source = map_channel_to_lead_source(channel)

    # 2. Get or create Client + Lead + Conversation
    client = get_or_create_client(
        db,
        full_name=sender_name,
        phone=sender_phone,
    )

    lead = get_or_create_lead_for_client(
        db,
        client=client,
        source=lead_source,
        source_details=source_details,
    )

    conversation = get_or_create_conversation(
        db,
        lead=lead,
        channel=channel,
        external_thread_id=external_thread_id,
    )

    # 3. Classify intent & store inbound message
    intent = classify_intent(text)
    inbound = save_inbound_message(
        db,
        conversation=conversation,
        text=text,
        external_message_id=None,
        raw_payload=raw_payload,
        intent_label=intent,
    )
    touch_lead_last_contact(db, lead=lead, channel=channel)

    # 4. Decide next state
    next_state = decide_next_state(conversation, lead, intent)

    # 5. Call corresponding "agent"
    if next_state == ConversationState.QUALIFYING:
        reply_text = run_qualifier_agent(db, lead, conversation, inbound)
        new_stage = LeadStage.QUALIFYING

    elif next_state == ConversationState.PACKAGE_RECOMMENDATION:
        reply_text = run_package_recommender_agent(db, lead, conversation, inbound)
        new_stage = LeadStage.QUOTED  # they've seen packages

    elif next_state == ConversationState.OBJECTION:
        reply_text = run_objection_agent(db, lead, conversation, inbound)
        new_stage = lead.stage or LeadStage.QUOTED

    elif next_state == ConversationState.BOOKING:
        reply_text = run_booking_agent(db, lead, client, conversation, inbound)
        # if booking agent successfully moves to tentative, we set stage there
        new_stage = lead.stage or LeadStage.TENTATIVE_BOOKING

    else:
        # fallback agent (small talk / help text)
        reply_text = run_fallback_agent(db, lead, conversation, inbound)
        new_stage = lead.stage or LeadStage.NEW

    # 6. Save outbound + update states
    save_outbound_message(
        db,
        conversation=conversation,
        text=reply_text,
        handled_by_agent=next_state.name.lower(),
    )
    update_conversation_state(db, conversation=conversation, new_state=next_state)
    update_lead_stage(db, lead=lead, new_stage=new_stage)

    return reply_text


def map_channel_to_lead_source(channel: Channel) -> LeadSource:
    if channel == Channel.WHATSAPP:
        return LeadSource.WHATSAPP
    if channel == Channel.INSTAGRAM:
        return LeadSource.INSTAGRAM_DM
    if channel == Channel.WEBSITE_CHAT:
        return LeadSource.WEBSITE_FORM
    return LeadSource.OTHER


# -------------------------------------------------------------------
# 4. QUALIFIER AGENT
# -------------------------------------------------------------------

def run_qualifier_agent(
    db: Session,
    lead: Lead,
    conversation: Conversation,
    inbound_message,
) -> str:
    """
    Ask smart, soft questions to fill in missing info:
    - lead_type
    - pregnancy / newborn details
    - location preference
    - timing
    """

    # 1. Ask lead type first
    if not lead.lead_type:
        return (
            f"Hi {lead.primary_contact_name or ''} 🥰\n\n"
            "Are you looking for a *maternity* photoshoot, a *newborn* shoot, "
            "a *maternity + newborn combo*, or a *baby/family* session?"
        )

    # 2. Maternity-specific questions
    if lead.lead_type == LeadType.MATERNITY:
        if not lead.gestation_weeks and not lead.due_date:
            return (
                "Beautiful! 🌸\n\n"
                "How many weeks pregnant are you right now, or which month are you in? "
                "This helps me suggest the perfect time for your maternity photoshoot."
            )

    # 3. Newborn-specific questions
    if lead.lead_type == LeadType.NEWBORN:
        if not lead.baby_dob and not lead.baby_age_days and not lead.baby_age_weeks:
            return (
                "Aww, congratulations on your baby! 👶✨\n\n"
                "How old is your baby today (in days or weeks)? "
                "Newborn photos are best done within the first 15 days."
            )

    # 4. Location preference
    if not lead.location_type_pref:
        return (
            "Would you prefer a cosy *home session*, a *studio* photoshoot, "
            "or an *outdoor* location?"
        )

    # 5. Preferred month / timing
    if not lead.preferred_month:
        return (
            "And which *month* are you thinking of for the photoshoot? "
            "I can then suggest the best slots for you 💫"
        )

    # If everything is filled, move to packages next time
    return (
        "Thank you for sharing these details! 💖\n\n"
        "Based on what you've shared, I’ll suggest some perfect packages for you now."
    )


# -------------------------------------------------------------------
# 5. PACKAGE RECOMMENDER AGENT
# -------------------------------------------------------------------

def run_package_recommender_agent(
    db: Session,
    lead: Lead,
    conversation: Conversation,
    inbound_message,
) -> str:
    """
    Suggest 2–3 packages tailored to lead_type & (optionally) budget band.
    """
    # Map LeadType -> SessionType/Package category
    if not lead.lead_type:
        # Safety fallback; ideally we never reach here without lead_type
        return run_qualifier_agent(db, lead, conversation, inbound_message)

    # Use LeadType name as category (they map nicely)
    packages = get_active_packages_by_category(db, category=lead.lead_type)

    if not packages:
        return (
            "Right now I'm updating our packages in the system 🙈\n"
            "Can I share the details and prices with you personally in a moment?"
        )

    # Pick top 2–3 packages
    selected = packages[:3]

    lines = ["Here are some options that most parents love 💕:\n"]
    for p in selected:
        line = format_package_line(p)
        lines.append(line)

    lines.append(
        "\nWhich one feels closest to what you’re looking for? "
        "I can also help you customise or explain the differences 😊"
    )

    return "\n".join(lines)


def format_package_line(pkg: Package) -> str:
    bits = [f"• *{pkg.name}* – ₹{int(pkg.base_price):,}"]

    details = []
    if pkg.duration_minutes:
        details.append(f"{pkg.duration_minutes} mins")
    if pkg.num_edited_photos:
        details.append(f"{pkg.num_edited_photos} edited photos")
    if pkg.num_outfits:
        details.append(f"{pkg.num_outfits} outfits")
    if pkg.includes_album:
        details.append("Album included")
    if pkg.includes_prints:
        details.append("Prints included")

    if details:
        bits.append(f"   ({', '.join(details)})")

    return " ".join(bits)


# -------------------------------------------------------------------
# 6. OBJECTION HANDLING AGENT
# -------------------------------------------------------------------

def run_objection_agent(
    db: Session,
    lead: Lead,
    conversation: Conversation,
    inbound_message,
) -> str:
    """
    Handle 'too costly', 'need to think', etc. Gently and value-focused.
    """
    text = (inbound_message.content_text or "").lower()

    if "expensive" in text or "costly" in text or "budget" in text:
        return (
            "I completely understand, and thank you for sharing that 🙏\n\n"
            "Our sessions are designed as once-in-a-lifetime memories for you and your baby, "
            "with a lot of care in posing, lighting, safety and editing.\n\n"
            "If you’d like, I can:\n"
            "• Suggest a *smaller package* that still captures beautiful memories, or\n"
            "• Help you compare 2 options so you can decide comfortably.\n\n"
            "Would you like to see a more *budget-friendly* option or understand "
            "the difference between the current options?"
        )

    if "later" in text or "think" in text or "discuss" in text:
        return (
            "Of course, please take your time 💛\n\n"
            "If it helps, I can also share a few sample images and a simple summary "
            "of 1–2 best options for you, so it’s easier to discuss at home.\n\n"
            "Would you like me to send: \n"
            "A) 3–4 sample photos\n"
            "B) A quick comparison of 2 best packages for you?"
        )

    # General reassurance
    return (
        "Thank you for being honest about your thoughts 💕\n\n"
        "Tell me what’s on your mind — is it more about *budget*, *time*, or *how the "
        "photoshoot will feel*? I’ll do my best to help you feel clear and comfortable."
    )


# -------------------------------------------------------------------
# 7. BOOKING AGENT (LIGHT VERSION)
# -------------------------------------------------------------------

def run_booking_agent(
    db: Session,
    lead: Lead,
    client: Client,
    conversation: Conversation,
    inbound_message,
) -> str:
    """
    Move from 'interested' to 'tentative booking' (in this light version,
    we don't integrate actual calendar yet – just a friendly step forward).
    """

    # Safety: need lead_type & at least one package in DB
    if not lead.lead_type:
        return run_qualifier_agent(db, lead, conversation, inbound_message)

    packages = get_active_packages_by_category(db, category=lead.lead_type)
    if not packages:
        return (
            "I’m so happy you’d like to go ahead 🥰\n"
            "I’m just updating our booking options in the system.\n"
            "Meanwhile, can I confirm which package name you liked the most?"
        )

    # For now, just use first package as default for session creation
    primary_pkg = packages[0]

    # Create or fetch a tentative session
    session_type = map_lead_type_to_session_type(lead.lead_type)
    session = get_or_create_tentative_session_for_lead(
        db,
        lead=lead,
        client=client,
        session_type=session_type,
        package=primary_pkg,
    )

    # Move lead stage to tentative booking
    if lead.stage != LeadStage.TENTATIVE_BOOKING:
        update_lead_stage(db, lead=lead, new_stage=LeadStage.TENTATIVE_BOOKING)

    # Create invoice placeholder (for later payment link)
    invoice = get_or_create_invoice_for_session(db, session=session)

    return (
        "Yay! I’m excited to photograph this special time for you 🥹📸\n\n"
        "To move forward, may I know:\n"
        "• Do you prefer *weekday* or *weekend*?\n"
        "• *Morning* or *evening* works better for you?\n\n"
        "Once I know this, I’ll share a few available slots for you to choose from, "
        "and then we can confirm your booking with a small advance payment."
    )


def map_lead_type_to_session_type(lead_type: LeadType) -> SessionType:
    if lead_type == LeadType.MATERNITY:
        return SessionType.MATERNITY
    if lead_type == LeadType.NEWBORN:
        return SessionType.NEWBORN
    if lead_type == LeadType.MATERNITY_NEWBORN_COMBO:
        return SessionType.COMBO
    if lead_type == LeadType.BABY_MILESTONE:
        return SessionType.BABY_MILESTONE
    return SessionType.FAMILY


# -------------------------------------------------------------------
# 8. FALLBACK AGENT
# -------------------------------------------------------------------

def run_fallback_agent(
    db: Session,
    lead: Lead,
    conversation: Conversation,
    inbound_message,
) -> str:
    """
    Used when we don't recognise the intent / state.
    """
    return (
        "Thank you for your message 💛\n\n"
        "I can help you with:\n"
        "• *Maternity photoshoot* details & pricing\n"
        "• *Newborn / baby* session information\n"
        "• Available dates & booking\n\n"
        "Tell me, are you enquiring more about *maternity*, *newborn*, or *family* photos?"
    )
