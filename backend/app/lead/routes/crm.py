# app/lead/routes/crm.py

from __future__ import annotations
from decimal import Decimal
from typing import List, Optional
from datetime import datetime
from app.tz import now_ist
from fastapi import APIRouter, Depends, HTTPException, Query, Response #type:ignore
from sqlalchemy.orm import Session #type:ignore
from sqlalchemy import select, func #type: ignore
from app.brand.watermark import BrandSettings
from app.database import get_db
from app.lead.models.lead_model import (
    Client,
    Lead,
    Session as PhotoSession,
    Package as PackageModel, PackageCategory,
    LeadStage,
    Conversation,
    Message,
    FollowUp,
    AddOn,
    SessionAddOn,
    Invoice,
    InvoiceStatus,
    PaymentStatus,
    Payment,
    PaymentGateway,
    PaymentType
)
from app.lead.schemas.lead_schemas import (
    ClientCreate,
    ClientUpdate,
    ClientRead,
    LeadCreate,
    LeadUpdate,
    LeadRead,
    SessionCreate,
    SessionUpdate,
    SessionRead,
    PackageCreate,
    PackageUpdate,
    PackageRead,
    DashboardSummary,
    LeadStageCount,
    AddOnCreate,
    AddOnRead,
    AddOnUpdate,
    SessionAddOnUpsert,
    SessionAddOnItemOut,
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceRead,
    PaymentCreate,
    PaymentRead,
)

from app.lead.services.invoice_pdf import build_invoice_pdf

router = APIRouter(prefix="/crm", tags=["crm"])


def _generate_invoice_number(session_id: int) -> str:
    # Simple predictable pattern, you can later swap to a sequence if needed
    ts = now_ist().strftime("%y%m%d%H%M%S")
    return f"ALRS-{session_id}-{ts}"

# -------------------
# CLIENTS
# -------------------

@router.post("/clients", response_model=ClientRead)
def create_client(data: ClientCreate, db: Session = Depends(get_db)):
    existing = db.execute(select(Client).where(Client.phone == data.phone)).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Client with this phone already exists")

    client = Client(**data.dict())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/clients", response_model=List[ClientRead])
def list_clients(
    db: Session = Depends(get_db),
    q: str | None = Query(None, description="Search by name or phone"),
    limit: int = 50,
    offset: int = 0,
):
    stmt = select(Client)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            (Client.full_name.ilike(like)) | (Client.phone.ilike(like))
        )

    stmt = stmt.order_by(Client.created_at.desc()).limit(limit).offset(offset)
    clients = db.execute(stmt).scalars().all()
    return clients


@router.get("/clients/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.patch("/clients/{client_id}", response_model=ClientRead)
def update_client(client_id: int, data: ClientUpdate, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(client, field, value)

    db.add(client)
    db.commit()
    db.refresh(client)
    return client

@router.delete("/clients/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    db.delete(client)
    db.commit()
    return Response(status_code=204)

# -------------------
# LEADS
# -------------------

@router.post("/leads", response_model=LeadRead)
def create_lead(data: LeadCreate, db: Session = Depends(get_db)):
    print(data)
    client = db.get(Client, data.client_id)
    if not client:
        raise HTTPException(status_code=400, detail="Client does not exist")

    lead = Lead(**data.dict())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/leads", response_model=List[LeadRead])
def list_leads(
    db: Session = Depends(get_db),
    stage: LeadStage | None = Query(None),
    limit: int = 50,
    offset: int = 0,
):
    stmt = select(Lead)

    if stage:
        stmt = stmt.where(Lead.stage == stage)

    stmt = stmt.order_by(Lead.created_at.desc()).limit(limit).offset(offset)
    leads = db.execute(stmt).scalars().all()
    return leads


@router.get("/leads/{lead_id}", response_model=LeadRead)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/leads/{lead_id}", response_model=LeadRead)
def update_lead(lead_id: int, data: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(lead, field, value)

    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

@router.delete("/leads/{lead_id}", status_code=204)
def delete_lead(lead_id: int, db: Session = Depends(get_db)) -> Response:
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Optional: safety check for linked sessions/invoices before delete

    db.delete(lead)
    db.commit()
    return Response(status_code=204)

@router.get("/leads/{lead_id}/timeline")
def get_lead_timeline(lead_id: int, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Fetch client
    client = db.get(Client, lead.client_id)

    # Sessions
    sessions = db.execute(
        select(PhotoSession).where(PhotoSession.lead_id == lead_id)
    ).scalars().all()

    # Conversations
    conversations = db.execute(
        select(Conversation).where(Conversation.lead_id == lead_id)
    ).scalars().all()

    # Messages
    messages = []
    for conv in conversations:
        msgs = db.execute(
            select(Message).where(Message.conversation_id == conv.id)
        ).scalars().all()
        messages.extend(msgs)

    # Follow-ups
    followups = db.execute(
        select(FollowUp).where(FollowUp.lead_id == lead_id)
    ).scalars().all()

    # Build timeline events sorted by time
    events = []

    # 1. Lead created
    events.append({
        "type": "lead_created",
        "timestamp": lead.created_at,
        "data": {
            "lead_id": lead.id,
            "stage": lead.stage,
        }
    })

    # 2. Stage updates
    # (use updated_at as proxy)
    events.append({
        "type": "lead_updated",
        "timestamp": lead.updated_at,
        "data": {"stage": lead.stage}
    })

    # 3. Messages
    for m in messages:
        events.append({
            "type": "message",
            "timestamp": m.created_at,
            "data": {
                "direction": "incoming" if m.sender_type == "CLIENT" else "outgoing",
                "text": m.content_text,
                "channel": m.content_type,
            }
        })

    # 4. Sessions
    for s in sessions:
        events.append({
            "type": "session",
            "timestamp": s.created_at,
            "data": {
                "session_id": s.id,
                "session_type": s.session_type,
                "scheduled_start": s.scheduled_start,
            }
        })

    # 5. Follow-ups
    for f in followups:
        events.append({
            "type": "followup",
            "timestamp": f.scheduled_at,
            "data": {
                "followup_id": f.id,
                "status": f.status,
                "type": f.type,
            }
        })

    # Sort by timestamp
    events = sorted(events, key=lambda e: e["timestamp"] or datetime.min)

    # Response structure
    return {
        "lead": lead,
        "client": client,
        "events": events,
        "sessions": sessions,
        "conversations": conversations,
        "followups": followups,
    }


# -------------------
# PACKAGES (READ ONLY)
# -------------------

@router.get("/packages", response_model=List[PackageRead])
def list_packages(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search by name/code"),
    is_active: Optional[bool] = Query(None),
    category: Optional[PackageCategory] = Query(None),
):
    query = db.query(PackageModel)

    if q:
        like = f"%{q}%"
        query = query.filter(
            (PackageModel.name.ilike(like)) | (PackageModel.code.ilike(like))
        )
    if is_active is not None:
        query = query.filter(PackageModel.is_active == is_active)
    if category is not None:
        query = query.filter(PackageModel.category == category)

    query = query.order_by(
        PackageModel.is_active.desc(),
        PackageModel.display_order.asc().nulls_last(),
        PackageModel.name.asc(),
    )
    return query.all()

@router.get("/packages/{package_id}", response_model=PackageRead)
def get_package(package_id: int, db: Session = Depends(get_db)):
    pkg = db.get(PackageModel, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    return pkg

@router.post("/packages", response_model=PackageRead, status_code=201)
def create_package(data: PackageCreate, db: Session = Depends(get_db)):
    # optional: enforce unique code
    existing = (
        db.query(PackageModel)
        .filter(PackageModel.code == data.code)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Package code already exists",
        )

    pkg = PackageModel(**data.dict())
    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    return pkg

@router.patch("/packages/{package_id}", response_model=PackageRead)
def update_package(
    package_id: int,
    data: PackageUpdate,
    db: Session = Depends(get_db),
):
    pkg = db.get(PackageModel, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")

    update_data = data.dict(exclude_unset=True)

    # if code is being changed, enforce uniqueness
    new_code = update_data.get("code")
    if new_code and new_code != pkg.code:
        exists = (
            db.query(PackageModel)
            .filter(PackageModel.code == new_code)
            .first()
        )
        if exists:
            raise HTTPException(
                status_code=400,
                detail="Another package with this code already exists",
            )

    for field, value in update_data.items():
        setattr(pkg, field, value)

    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    return pkg

@router.delete("/packages/{package_id}", status_code=204)
def delete_package(package_id: int, db: Session = Depends(get_db)):
    pkg = db.get(PackageModel, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")

    # If you want soft delete later, change to pkg.is_active = False instead
    db.delete(pkg)
    db.commit()
    return None

# -------------------
# SESSIONS
# -------------------

@router.post("/sessions", response_model=SessionRead)
def create_session(data: SessionCreate, db: Session = Depends(get_db)):
    lead = db.get(Lead, data.lead_id)
    if not lead:
        raise HTTPException(status_code=400, detail="Lead does not exist")

    client = db.get(Client, data.client_id)
    if not client:
        raise HTTPException(status_code=400, detail="Client does not exist")

    pkg = db.get(PackageModel, data.package_id)
    if not pkg:
        raise HTTPException(status_code=400, detail="Package does not exist")

    session = PhotoSession(**data.dict())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=List[SessionRead])
def list_sessions(
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    stmt = (
        select(PhotoSession)
        .order_by(PhotoSession.scheduled_start.nullslast(), PhotoSession.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = db.execute(stmt).scalars().all()
    return sessions


@router.get("/sessions/{session_id}", response_model=SessionRead)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.get(PhotoSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/sessions/{session_id}", response_model=SessionRead)
def update_session(
    session_id: int,
    data: SessionUpdate,
    db: Session = Depends(get_db),
):
    session = db.get(PhotoSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    for field, value in data.dict(exclude_unset=True).items():
        print(field, value)
        setattr(session, field, value)

    db.add(session)
    db.commit()
    db.refresh(session)
    return session

# -------------------- Session add-ons -------------------- #

@router.get(
    "/sessions/{session_id}/add-ons",
    response_model=List[SessionAddOnItemOut],
)
def get_session_add_ons(
    session_id: int,
    db: Session = Depends(get_db),
) -> List[SessionAddOnItemOut]:
    sess = db.get(PhotoSession, session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    rows: list[SessionAddOn] = (
        db.query(SessionAddOn)
        .filter(SessionAddOn.session_id == session_id)
        .all()
    )

    return [
        SessionAddOnItemOut(
            add_on_id=row.add_on_id,
            quantity=row.quantity,
            price_per_unit=row.price_per_unit,
            total_price=row.total_price,
        )
        for row in rows
    ]


@router.put(
    "/sessions/{session_id}/add-ons",
    response_model=List[SessionAddOnItemOut],
)
def set_session_add_ons(
    session_id: int,
    payload: SessionAddOnUpsert,
    db: Session = Depends(get_db),
) -> List[SessionAddOnItemOut]:
    sess = db.get(PhotoSession, session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    # Clear existing add-ons for this session
    db.query(SessionAddOn).filter(
        SessionAddOn.session_id == session_id
    ).delete()

    result: list[SessionAddOnItemOut] = []

    for item in payload.items:
        add_on = db.get(AddOn, item.add_on_id)
        if not add_on:
            raise HTTPException(
                status_code=400,
                detail=f"Add-on {item.add_on_id} not found",
            )
        if not add_on.is_active:
            raise HTTPException(
                status_code=400,
                detail=f"Add-on {add_on.name} is not active",
            )

        price_per_unit = add_on.price
        total_price = price_per_unit * item.quantity

        row = SessionAddOn()
        row.session_id = session_id
        row.add_on_id = add_on.id
        row.quantity = item.quantity
        row.price_per_unit = price_per_unit
        row.total_price = total_price

        db.add(row)

        result.append(
            SessionAddOnItemOut(
                add_on_id=add_on.id,
                quantity=item.quantity,
                price_per_unit=price_per_unit,
                total_price=total_price,
            )
        )

    # Optionally: auto-bump session.final_price here
    # Example: session.final_price = (session.total_price or 0) + sum(add-ons)
    # Uncomment if you want that:

    # add_ons_total = sum([r.total_price for r in result])
    # base_total = sess.total_price or 0
    # sess.final_price = base_total + add_ons_total
    # db.add(sess)

    db.commit()
    return result


# -------------------
# ADD-ONS
# -------------------

@router.get("/add-ons", response_model=List[AddOnRead])
def list_add_ons(
    db: Session = Depends(get_db),
    is_active: Optional[bool] = Query(True),
):
    q = db.query(AddOn)
    if is_active is not None:
        q = q.filter(AddOn.is_active == is_active)
    return q.order_by(AddOn.category, AddOn.name).all()



@router.post("/add-ons", response_model=AddOnRead)
def create_add_on(data: AddOnCreate, db: Session = Depends(get_db)) -> AddOn:
    # ensure unique code
    existing = (
        db.query(AddOn)
        .filter(AddOn.code == data.code)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Add-on code already exists",
        )

    add_on = AddOn(**data.dict())
    db.add(add_on)
    db.commit()
    db.refresh(add_on)
    return add_on


@router.patch("/add-ons/{add_on_id}", response_model=AddOnRead)
def update_add_on(
    add_on_id: int,
    data: AddOnUpdate,
    db: Session = Depends(get_db),
) -> AddOn:
    add_on = db.get(AddOn, add_on_id)
    if not add_on:
        raise HTTPException(status_code=404, detail="Add-on not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(add_on, field, value)

    db.add(add_on)
    db.commit()
    db.refresh(add_on)
    return add_on

@router.delete("/add-ons/{add_on_id}", status_code=204)
def delete_add_on(add_on_id: int, db: Session = Depends(get_db)) -> None:
    add_on = db.get(AddOn, add_on_id)
    if not add_on:
        raise HTTPException(status_code=404, detail="Add-on not found")

    db.delete(add_on)
    db.commit()
    return None

# -------------------
# DASHBOARD SUMMARY
# -------------------

@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_clients = db.execute(select(func.count(Client.id))).scalar_one()
    total_leads = db.execute(select(func.count(Lead.id))).scalar_one()
    total_sessions = db.execute(select(func.count(PhotoSession.id))).scalar_one()

    # leads grouped by stage
    rows = db.execute(
        select(Lead.stage, func.count(Lead.id)).group_by(Lead.stage)
    ).all()

    leads_by_stage: list[LeadStageCount] = []
    for stage, count in rows:
        if stage is None:
            continue
        leads_by_stage.append(LeadStageCount(stage=stage, count=count))

    return DashboardSummary(
        total_clients=total_clients,
        total_leads=total_leads,
        total_sessions=total_sessions,
        leads_by_stage=leads_by_stage,
    )


#-----------------
# INVOICES
#-----------------
@router.post(
    "/sessions/{session_id}/invoice",
    response_model=InvoiceRead,
    status_code=201,
)
def create_invoice_for_session(
    session_id: int,
    data: InvoiceCreate,
    db: Session = Depends(get_db),
):
    sess = db.get(PhotoSession, session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    # Optional: don't allow multiple invoices per session (you can change this)
    existing = db.execute(
        select(Invoice).where(Invoice.session_id == session_id)
    ).scalars().first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Invoice already exists for this session",
        )

    invoice_number = _generate_invoice_number(session_id)

    inv = Invoice()
    inv.session_id = session_id
    inv.invoice_number = invoice_number
    inv.total_amount = data.total_amount
    inv.currency = data.currency
    inv.status = data.status or InvoiceStatus.DRAFT
    inv.issued_at = data.issued_at or now_ist()
    inv.due_at = data.due_at

    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/invoices", response_model=List[InvoiceRead])
def list_invoices(
    status: InvoiceStatus | None = Query(default=None),
    client_id: int | None = Query(default=None),
    session_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = select(Invoice)

    if status is not None:
        stmt = stmt.where(Invoice.status == status)
    if session_id is not None:
        stmt = stmt.where(Invoice.session_id == session_id)
    if client_id is not None:
        # join sessions → filter by client
        stmt = (
            stmt.join(PhotoSession, PhotoSession.id == Invoice.session_id)
            .where(PhotoSession.client_id == client_id)
        )

    rows = db.execute(stmt.order_by(Invoice.created_at.desc())).scalars().all()
    return rows

@router.patch("/invoices/{invoice_id}", response_model=InvoiceRead)
def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(inv, field, value)

    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.delete("/invoices/{invoice_id}", status_code=204)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db.delete(inv)
    db.commit()
    return Response(status_code=204)


@router.post(
    "/invoices/{invoice_id}/payments",
    response_model=PaymentRead,
    status_code=201,
)
def add_payment(
    invoice_id: int,
    data: PaymentCreate,
    db: Session = Depends(get_db),
):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Create payment
    paid_at = data.paid_at or datetime.utcnow()

    pay = Payment()
    pay.invoice_id = invoice_id
    pay.session_id = inv.session_id
    pay.amount = data.amount
    pay.currency = data.currency
    pay.status = data.status or PaymentStatus.SUCCESS
    pay.type = data.type or PaymentType.BALANCE
    pay.gateway = data.gateway or PaymentGateway.OTHER
    pay.gateway_ref = data.gateway_ref
    pay.paid_at = paid_at

    db.add(pay)

    # Recalculate invoice status based on successful payments
    db.flush()  # make sure new payment is visible in the session

    total_paid: Decimal = (
        db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0))
            .where(
                Payment.invoice_id == invoice_id,
                Payment.status == PaymentStatus.SUCCESS,
            )
        ).scalar_one()
    )

    if total_paid >= inv.total_amount:
        inv.status = InvoiceStatus.PAID
    elif total_paid > 0:
        inv.status = InvoiceStatus.PARTIALLY_PAID
    else:
        inv.status = InvoiceStatus.SENT  # or keep whatever it was

    db.add(inv)
    db.commit()
    db.refresh(pay)
    return pay


@router.get(
    "/invoices/{invoice_id}/payments",
    response_model=List[PaymentRead],
)
def list_payments_for_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    rows = (
        db.execute(
            select(Payment)
            .where(Payment.invoice_id == invoice_id)
            .order_by(Payment.created_at.desc())
        )
        .scalars()
        .all()
    )
    return rows


@router.get("/invoices/{invoice_id}/pdf", response_class=Response)
def download_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    sess = db.get(PhotoSession, invoice.session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found for invoice")

    client = db.get(Client, sess.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found for invoice")

    payments = db.scalars(
        select(Payment).where(Payment.invoice_id == invoice.id)
    ).all()

    # ensure relationships available
    db.refresh(sess)  # loads .package / .session_add_ons lazily if configured

    # or explicitly load add-ons if you prefer:
    session_add_ons = db.scalars(
        select(SessionAddOn).where(SessionAddOn.session_id == sess.id)
    ).all()

    brand: BrandSettings | None = db.query(BrandSettings).first()
    logo_path: str | None = None
    if brand and brand.logo_path:
        logo_path = brand.logo_path  # or os.path.join(settings.MEDIA_ROOT, brand.logo_path)

    studio_name = brand.studio_name if brand and brand.studio_name else "Alluring Lens Studios"
    studio_address = "Bengaluru, India"
    studio_phone = "+91-XXXXXXXXXX"
    studio_email = "hello@alluringlens.in"

    pdf_bytes = build_invoice_pdf(
        invoice=invoice,
        session=sess,
        client=client,
        payments=list(payments),
        package=sess.package,
        session_add_ons=session_add_ons,
        studio_name=studio_name,
        studio_address=studio_address,
        studio_phone=studio_phone,
        studio_email=studio_email,
        gstin="29ACCFA0065F1ZR",
        pan="ACCFA0065F",
        logo_path=logo_path,  # wherever you store your logo
        payment_qr_data="upi://pay?pa=your-vpa@bank&am=1234&cu=INR",  # or Razorpay link
    )

    filename = (invoice.invoice_number or f"invoice-{invoice.id}") + ".pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
        },
    )
