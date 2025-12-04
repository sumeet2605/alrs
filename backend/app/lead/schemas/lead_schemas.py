# app/lead/schemas.py

from __future__ import annotations

from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field #type:ignore

from app.lead.models.lead_model import (
    LeadType,
    LeadSource,
    LeadStage,
    LocationType,
    BudgetBand,
    SessionType,
    SessionStatus,
    PackageCategory,
    AddOnCategory,
    InvoiceStatus,
    PaymentStatus,
    PaymentGateway,
    PaymentType
)


# -------------------
# CLIENT
# -------------------

class ClientBase(BaseModel):
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    city: Optional[str] = None
    area: Optional[str] = None
    relation: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    city: Optional[str] = None
    area: Optional[str] = None
    relation: Optional[str] = None


class ClientRead(ClientBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# -------------------
# LEAD
# -------------------

class LeadBase(BaseModel):
    client_id: int
    primary_contact_name: Optional[str] = None
    primary_contact_phone: str
    primary_contact_email: Optional[EmailStr] = None

    lead_type: Optional[LeadType] = None
    source: Optional[LeadSource] = LeadSource.INSTAGRAM_DM
    source_details: Optional[str] = None

    stage: Optional[LeadStage] = LeadStage.NEW
    status_reason: Optional[str] = None

    preferred_month: Optional[date] = None
    location_type_pref: Optional[LocationType] = None
    location_area_pref: Optional[str] = None

    budget_band: Optional[BudgetBand] = BudgetBand.UNKNOWN
    priority_score: Optional[int] = 0

    is_pregnant: Optional[bool] = None
    due_date: Optional[date] = None
    gestation_weeks: Optional[int] = None

    baby_dob: Optional[date] = None
    baby_age_days: Optional[int] = None
    baby_age_weeks: Optional[int] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    primary_contact_name: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    primary_contact_email: Optional[EmailStr] = None

    lead_type: Optional[LeadType] = None
    source: Optional[LeadSource] = None
    source_details: Optional[str] = None

    stage: Optional[LeadStage] = None
    status_reason: Optional[str] = None

    preferred_month: Optional[date] = None
    location_type_pref: Optional[LocationType] = None
    location_area_pref: Optional[str] = None

    budget_band: Optional[BudgetBand] = None
    priority_score: Optional[int] = None

    is_pregnant: Optional[bool] = None
    due_date: Optional[date] = None
    gestation_weeks: Optional[int] = None

    baby_dob: Optional[date] = None
    baby_age_days: Optional[int] = None
    baby_age_weeks: Optional[int] = None


class LeadRead(LeadBase):
    id: int
    last_contacted_at: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# -------------------
# PACKAGE
# -------------------

class PackageBase(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=150)
    category: PackageCategory
    description: Optional[str] = None
    base_price: Decimal
    currency: Optional[str] = Field(default="INR", max_length=10)
    duration_minutes: Optional[int] = None
    num_edited_photos: Optional[int] = None
    num_outfits: Optional[int] = None
    includes_album: Optional[bool] = False
    includes_prints: Optional[bool] = False
    is_active: Optional[bool] = True
    display_order: Optional[int] = None


class PackageCreate(PackageBase):
    """Payload for creating a new package."""
    pass


class PackageUpdate(BaseModel):
    """Partial update of a package."""
    code: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, max_length=150)
    category: Optional[PackageCategory] = None
    description: Optional[str] = None
    base_price: Optional[Decimal] = None
    currency: Optional[str] = Field(default=None, max_length=10)
    duration_minutes: Optional[int] = None
    num_edited_photos: Optional[int] = None
    num_outfits: Optional[int] = None
    includes_album: Optional[bool] = None
    includes_prints: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class PackageRead(PackageBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# -------------------
# SESSION
# -------------------

class SessionBase(BaseModel):
    lead_id: int
    client_id: int
    package_id: int
    session_type: SessionType
    status: Optional[SessionStatus] = SessionStatus.TENTATIVE

    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None

    location_type: LocationType
    location_address: Optional[str] = None
    total_price: Optional[float] = None
    gallery_ids: Optional[List[int]] = None
    discount_amount: Optional[float] = 0
    final_price: Optional[float] = None

    notes_photographer: Optional[str] = None
    notes_client_visible: Optional[str] = None


class SessionCreate(SessionBase):
    pass


class SessionUpdate(BaseModel):
    package_id: int
    status: Optional[SessionStatus] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    location_type: Optional[LocationType] = None
    location_address: Optional[str] = None
    total_price: Optional[float] = None
    gallery_ids: Optional[List[int]] = None
    discount_amount: Optional[float] = None
    final_price: Optional[float] = None
    notes_photographer: Optional[str] = None
    notes_client_visible: Optional[str] = None


class SessionRead(SessionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SessionGalleryBulkUpdate(BaseModel):
    gallery_ids: List[int]

class SessionGalleryOut(BaseModel):
    gallery_id: int
    title: str
    is_public: bool | None = None
    created_at: datetime | None = None
    preview_photo_url: str | None = None  # optional, if you have it

    class Config:
        from_attributes = True


class AddOnBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    price: Decimal
    category: AddOnCategory
    is_active: bool = True

class AddOnCreate(AddOnBase):
    pass

class AddOnUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    category: Optional[AddOnCategory] = None
    is_active: Optional[bool] = None

class AddOnRead(AddOnBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------- Session add-ons ----------

class SessionAddOnItemIn(BaseModel):
    add_on_id: int
    quantity: int = Field(1, ge=1)


class SessionAddOnItemOut(SessionAddOnItemIn):
    price_per_unit: Decimal
    total_price: Decimal

    class Config:
        from_attributes = True


class SessionAddOnUpsert(BaseModel):
    items: List[SessionAddOnItemIn]

# -------------------
# DASHBOARD SUMMARY
# -------------------

class LeadStageCount(BaseModel):
    stage: LeadStage
    count: int

class SourceCount(BaseModel):
    source: Optional[LeadSource]
    count: int

class RevenuePoint(BaseModel):
    date: date
    amount: Decimal



class DashboardSummary(BaseModel):
    total_leads: int
    total_clients: int
    total_sessions: int
    total_invoices: int
    leads_by_stage: List[LeadStageCount]
    leads_by_source: List[SourceCount]

    revenue_last_30_days: Decimal
    paid_last_30_days: Decimal

    upcoming_sessions: int


# -------------------
# INVOICE
# -------------------
class InvoiceBase(BaseModel):
    session_id: int
    total_amount: Decimal
    currency: Optional[str] = "INR"
    status: Optional[InvoiceStatus] = InvoiceStatus.DRAFT
    issued_at: Optional[datetime] = None
    due_at: Optional[datetime] = None


class InvoiceCreate(InvoiceBase):
    # invoice_number is generated by backend
    pass


class InvoiceUpdate(BaseModel):
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    status: Optional[InvoiceStatus] = None
    issued_at: Optional[datetime] = None
    due_at: Optional[datetime] = None


class InvoiceRead(BaseModel):
    id: int
    session_id: int
    invoice_number: str
    total_amount: Decimal
    currency: Optional[str] = "INR"
    status: InvoiceStatus
    issued_at: Optional[datetime]
    due_at: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True  # Pydantic v2 (or orm_mode = True in v1)

# -------------------
# PAYMENT
# -------------------
class PaymentBase(BaseModel):
    invoice_id: int
    amount: Decimal
    currency: Optional[str] = "INR"
    status: Optional[PaymentStatus] = PaymentStatus.SUCCESS
    type: Optional[PaymentType] = PaymentType.BALANCE
    gateway: Optional[PaymentGateway] = PaymentGateway.OTHER
    gateway_ref: Optional[str] = None
    paid_at: Optional[datetime] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentRead(BaseModel):
    id: int
    invoice_id: int
    session_id: int
    amount: Decimal
    currency: Optional[str] = "INR"
    status: PaymentStatus
    type: PaymentType
    gateway: PaymentGateway
    gateway_ref: Optional[str]
    paid_at: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


