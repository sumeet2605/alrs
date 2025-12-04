from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import ( #type: ignore
    Column,
    String,
    Integer,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    Text,
    JSON,
    UniqueConstraint,
    func,
) #type: ignore
from sqlalchemy.orm import relationship #type: ignore
from app.database import Base
from sqlalchemy import UniqueConstraint #type: ignore
from app.associations import session_galleries

# Use shared Base from app.database

# -------------------------------------------------------
# ENUM DEFINITIONS
# -------------------------------------------------------

class LeadType(PyEnum):
    MATERNITY = "maternity"
    NEWBORN = "newborn"
    MATERNITY_NEWBORN_COMBO = "maternity_newborn_combo"
    BABY_MILESTONE = "baby_milestone"
    FAMILY = "family"
    OTHER = "other"

class LeadSource(PyEnum):
    INSTAGRAM_DM = "instagram_dm"
    WHATSAPP = "whatsapp"
    WEBSITE_FORM = "website_form"
    REFERRAL = "referral"
    FACEBOOK = "facebook"
    WALK_IN = "walk_in"
    OTHER = "other"

class LeadStage(PyEnum):
    NEW = "new"
    QUALIFYING = "qualifying"
    QUALIFIED = "qualified"
    QUOTED = "quoted"
    TENTATIVE_BOOKING = "tentative_booking"
    BOOKED = "booked"
    SHOT = "shot"
    DELIVERED = "delivered"
    CLOSED_LOST = "closed_lost"
    CONTACTED = "contacted"
    COMPLETED = "completed"


class LocationType(PyEnum):
    HOME = "home"
    STUDIO = "studio"
    OUTDOOR = "outdoor"
    UNDECIDED = "undecided"

class BudgetBand(PyEnum):
    LT_10K = "<10k"
    B10_20K = "10k-20k"
    B20_40K = "20k-40k"
    GT_40K = ">40k"
    UNKNOWN = "unknown"

class PackageCategory(PyEnum):
    MATERNITY = "maternity"
    NEWBORN = "newborn"
    COMBO = "combo"
    BABY_MILESTONE = "baby_milestone"
    FAMILY = "family"

class SessionType(PyEnum):
    MATERNITY = "maternity"
    NEWBORN = "newborn"
    COMBO = "combo"
    BABY_MILESTONE = "baby_milestone"
    FAMILY = "family"

class SessionStatus(PyEnum):
    TENTATIVE = "tentative"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"

class AddOnCategory(PyEnum):
    PRINT = "print"
    FRAME = "frame"
    EXTRA_PHOTOS = "extra_photos"
    ALBUM_UPGRADE = "album_upgrade"
    VIDEO = "video"
    OTHER = "other"

class InvoiceStatus(PyEnum):
    DRAFT = "draft"
    SENT = "sent"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    CANCELLED = "cancelled"

class PaymentStatus(PyEnum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentType(PyEnum):
    BOOKING_ADVANCE = "booking_advance"
    BALANCE = "balance"
    ADD_ON = "add_on"
    OTHER = "other"

class PaymentGateway(PyEnum):
    RAZORPAY = "razorpay"
    STRIPE = "stripe"
    CASH = "cash"
    UPI = "upi"
    BANK = "bank_transfer"
    OTHER = "other"

class Channel(PyEnum):
    INSTAGRAM = "instagram"
    WHATSAPP = "whatsapp"
    WEBSITE_CHAT = "website_chat"

class ConversationState(PyEnum):
    NEW_INQUIRY = "new_inquiry"
    QUALIFYING = "qualifying"
    PACKAGE_RECOMMENDATION = "package_recommendation"
    OBJECTION = "objection"
    BOOKING = "booking"
    POST_BOOKING_PRE_SHOOT = "post_booking_pre_shoot"
    POST_SHOOT_DELIVERY = "post_shoot_delivery"
    NURTURE_LONG_TERM = "nurture_long_term"

class SenderType(PyEnum):
    CLIENT = "client"
    HUMAN_STAFF = "human_staff"
    AI_AGENT = "ai_agent"
    SYSTEM = "system"

class ContentType(PyEnum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    FILE = "file"
    TEMPLATE = "template"

class FollowUpType(PyEnum):
    QUOTE_REMINDER = "quote_reminder"
    BOOKING_NUDGE = "booking_nudge"
    NEWBORN_WINDOW = "newborn_window"
    MILESTONE_6M = "milestone_6m"
    MILESTONE_1Y = "milestone_1y"
    REVIEW_REQUEST = "review_request"
    UPSELL_ALBUM = "upsell_album"
    OTHER = "other"

class FollowUpStatus(PyEnum):
    SCHEDULED = "scheduled"
    SENT = "sent"
    CANCELLED = "cancelled"
    FAILED = "failed"

class FollowUpChannel(PyEnum):
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    EMAIL = "email"

class FollowUpCreatedBy(PyEnum):
    AI = "ai"
    HUMAN = "human"
    SYSTEM = "system"

# -------------------------------------------------------
# MIXINS
# -------------------------------------------------------

class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

# -------------------------------------------------------
# MODELS (INTEGER PK VERSION)
# -------------------------------------------------------

class Client(TimestampMixin, Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=False, unique=True)
    email = Column(String(150))
    city = Column(String(100))
    area = Column(String(100))
    relation = Column(String(50))

    leads = relationship("Lead", back_populates="client", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="client", cascade="all, delete-orphan")


class Lead(TimestampMixin, Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id"))
    client = relationship("Client", back_populates="leads")

    primary_contact_name = Column(String(150))
    primary_contact_phone = Column(String(20), nullable=False)
    primary_contact_email = Column(String(150))

    lead_type = Column(Enum(LeadType))
    source = Column(Enum(LeadSource), default=LeadSource.INSTAGRAM_DM)
    source_details = Column(String(255))

    stage = Column(Enum(LeadStage), default=LeadStage.NEW)
    status_reason = Column(String(255))

    preferred_month = Column(Date)
    location_type_pref = Column(Enum(LocationType))
    location_area_pref = Column(String(150))

    budget_band = Column(Enum(BudgetBand), default=BudgetBand.UNKNOWN)
    priority_score = Column(Integer, default=0)

    # Maternity
    is_pregnant = Column(Boolean)
    due_date = Column(Date)
    gestation_weeks = Column(Integer)

    # Newborn
    baby_dob = Column(Date)
    baby_age_days = Column(Integer)
    baby_age_weeks = Column(Integer)

    last_contacted_at = Column(DateTime(timezone=True))
    last_channel = Column(Enum(Channel))

    conversations = relationship("Conversation", back_populates="lead", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="lead", cascade="all, delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="lead", cascade="all, delete-orphan")


class Package(TimestampMixin, Base):
    __tablename__ = "packages"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    category = Column(Enum(PackageCategory), nullable=False)
    description = Column(Text)

    base_price = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="INR")

    duration_minutes = Column(Integer)
    num_edited_photos = Column(Integer)
    num_outfits = Column(Integer)
    includes_album = Column(Boolean, default=False)
    includes_prints = Column(Boolean, default=False)

    is_active = Column(Boolean, default=True)
    display_order = Column(Integer)

    sessions = relationship("Session", back_populates="package")


class AddOn(TimestampMixin, Base):
    __tablename__ = "add_ons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text)
    price = Column(Numeric(12, 2), nullable=False)
    category = Column(Enum(AddOnCategory), nullable=False)
    is_active = Column(Boolean, default=True)

    session_add_ons = relationship("SessionAddOn", back_populates="add_on", cascade="all, delete-orphan")


class Session(TimestampMixin, Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)

    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    package_id = Column(Integer, ForeignKey("packages.id"), nullable=False)
    

    session_type = Column(Enum(SessionType), nullable=False)
    status = Column(Enum(SessionStatus), default=SessionStatus.TENTATIVE)

    scheduled_start = Column(DateTime(timezone=True))
    scheduled_end = Column(DateTime(timezone=True))

    location_type = Column(Enum(LocationType), nullable=False)
    location_address = Column(Text)
    google_calendar_event_id = Column(String(255))

    total_price = Column(Numeric(12, 2))
    discount_amount = Column(Numeric(12, 2), default=0)
    final_price = Column(Numeric(12, 2))

    notes_photographer = Column(Text)
    notes_client_visible = Column(Text)

    lead = relationship("Lead", back_populates="sessions")
    client = relationship("Client", back_populates="sessions")
    package = relationship("Package", back_populates="sessions")
   
    session_add_ons = relationship("SessionAddOn", back_populates="session", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="session", cascade="all, delete-orphan")
    galleries = relationship("Gallery", secondary=session_galleries, back_populates="sessions", viewonly=True)

class SessionAddOn(TimestampMixin, Base):
    __tablename__ = "session_add_ons"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    add_on_id = Column(Integer, ForeignKey("add_ons.id"), nullable=False)
    quantity = Column(Integer, default=1)
    price_per_unit = Column(Numeric(12, 2), nullable=False)
    total_price = Column(Numeric(12, 2), nullable=False)
    session = relationship("Session", back_populates="session_add_ons")
    add_on = relationship("AddOn", back_populates="session_add_ons")


class Invoice(TimestampMixin, Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)

    total_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT)

    issued_at = Column(DateTime(timezone=True))
    due_at = Column(DateTime(timezone=True))

    session = relationship("Session", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")


class Payment(TimestampMixin, Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)

    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    type = Column(Enum(PaymentType), default=PaymentType.BOOKING_ADVANCE)
    gateway = Column(Enum(PaymentGateway), default=PaymentGateway.RAZORPAY)
    gateway_ref = Column(String(255))
    paid_at = Column(DateTime(timezone=True))

    invoice = relationship("Invoice", back_populates="payments")
    session = relationship("Session")


class Conversation(TimestampMixin, Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)

    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    channel = Column(Enum(Channel), nullable=False)
    external_thread_id = Column(String(255), nullable=False)

    current_state = Column(Enum(ConversationState))
    last_message_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)

    lead = relationship("Lead", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("channel", "external_thread_id", name="uq_conversations_channel_thread"),
    )


class Message(TimestampMixin, Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)

    sender_type = Column(Enum(SenderType), nullable=False)
    sender_id = Column(Integer)

    external_message_id = Column(String(255))
    content_text = Column(Text)
    content_type = Column(Enum(ContentType), default=ContentType.TEXT)
    raw_payload = Column(JSON)

    intent_label = Column(String(50))
    handled_by_agent = Column(String(50))

    conversation = relationship("Conversation", back_populates="messages")


class FollowUp(TimestampMixin, Base):
    __tablename__ = "follow_ups"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"))

    type = Column(Enum(FollowUpType), nullable=False)
    channel = Column(Enum(FollowUpChannel), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    sent_at = Column(DateTime(timezone=True))
    status = Column(Enum(FollowUpStatus), default=FollowUpStatus.SCHEDULED)

    template_id = Column(String(50))
    created_by = Column(Enum(FollowUpCreatedBy), default=FollowUpCreatedBy.AI)

    lead = relationship("Lead", back_populates="follow_ups")
    session = relationship("Session")


