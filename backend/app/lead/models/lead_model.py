from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, Text, DateTime, Index, Numeric, TSTZRANGE #type: ignore
from sqlalchemy.sql import func, text #type: ignore
from sqlalchemy import ForeignKey #type: ignore
from sqlalchemy.orm import relationship #type: ignore
from app.database import Base #type: ignore

class TimestampMixin:
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())

class Contact(Base, TimestampMixin):
    __tablename__ = "contacts"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    source = Column(String(255), nullable=True)
    tags = Column(String(512), nullable=True)  # comma-separated tags
    notes = Column(Text, nullable=True)
    metadata = Column(Text, nullable=True)  # JSON string for additional data

    bookings = relationship("Booking", back_populates="contact", cascade="save-update")
    invoices = relationship("Invoice", back_populates="contact", cascade="save-update")

    ___table_args__ = (
        Index("idx_contacts_email_lower", func.lower(email), postgresql_using="btree"),
        Index("idx_contacts_phone", phone, postgresql_using="btree"))


class Booking(Base, TimestampMixin):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="SET NULL"), index=True, nullable=True)
    studio_id = Column(Integer, ForeignKey("studios.id", ondelete="SET NULL"), index=True, nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    status = Column(String(50), nullable=False, default="pending")  # e.g. pending, confirmed, cancelled
    location = Column(String(255), nullable=True)
    timezone = Column(String(100), nullable=True)
    slot_metadata = Column(Text, nullable=True)  # JSON string for additional slot info
    deposit_amount = Column(Numeric(10, 2), nullable=True, server_default=text("0.00"))
    deposit_paid = Column(Boolean, default=False, nullable=False, server_default=text("false"))
    payment_reference = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    timespan = Column(TSTZRANGE, nullable=True)  # JSON string for additional timespan info
    
    contact = relationship("Contact", back_populates="bookings", lazy="joined")
    studio = relationship("Studio", back_populates="bookings", lazy="joined")
    invoices = relationship("Invoice", back_populates="booking", cascade="all, delete-orphan")
    project = relationship("Project", back_populates="bookings", uselist=False)
