from io import BytesIO
from typing import List, Optional, Sequence
from decimal import Decimal

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib import colors

from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
import tempfile
import os
from app.storage import storage 
from pathlib import Path
import app.config as config
from PIL import (Image, ImageOps, ImageDraw, ImageFont, ImageEnhance, ImageFile)  # type: ignore

from app.lead.models.lead_model import (
    Invoice,
    Session,
    Client,
    Payment,
    SessionAddOn,
    AddOn,
    Package,
)


def _num(val: Optional[Decimal | float | int]) -> float:
    if val is None:
        return 0.0
    return float(val)


def build_invoice_pdf(
    invoice: Invoice,
    session: Session,
    client: Client,
    payments: List[Payment],
    package: Optional[Package] = None,
    session_add_ons: Optional[Sequence[SessionAddOn]] = None,
    studio_name: str = "Alluring Lens Studios",
    studio_address: str = "Bengaluru, India",
    studio_phone: str = "+91-XXXXXXXXXX",
    studio_email: str = "hello@alluringlens.in",
    gstin: str = "29ACCFA0065F1ZR",
    pan: Optional[str] = None,
    logo_path: Optional[str] = None,           # path to logo image (PNG/JPG)
    payment_qr_data: Optional[str] = None,     # e.g. UPI/Razorpay URL or UPI string
) -> bytes:
    """
    Branded A4 invoice PDF.

    Features:
    - Logo + studio info + GSTIN/PAN in header
    - Base package + add-ons as line items
    - GST @ 6% (included) breakdown
    - Pastel border & watermark
    - Optional QR code for online payment
    """

    # allow lazy relationships if not passed explicitly
    if package is None and getattr(session, "package", None) is not None:
        package = session.package  # type: ignore[assignment]
    if session_add_ons is None and getattr(session, "session_add_ons", None) is not None:
        session_add_ons = list(session.session_add_ons)  # type: ignore[assignment]

    # derive PAN from GSTIN if not explicitly provided (middle 10 chars)
    effective_pan = pan
    if effective_pan is None and gstin and len(gstin) >= 12:
        effective_pan = gstin[2:12]

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    margin_left = 25 * mm
    margin_top = height - 25 * mm

    # ---------- PASTEL BORDER ----------
    c.setStrokeColorRGB(0.90, 0.82, 0.96)  # soft lilac
    c.setLineWidth(1.4)
    c.roundRect(
        15 * mm,
        15 * mm,
        width - 30 * mm,
        height - 30 * mm,
        8 * mm,
        stroke=1,
        fill=0,
    )

    # ---------- WATERMARK ----------
    c.saveState()
    c.setFont("Helvetica-Bold", 60)
    c.setFillColorRGB(0.95, 0.92, 0.98)  # very light lavender
    c.translate(width / 2, height / 2)
    c.rotate(35)
    c.drawCentredString(0, 0, studio_name.upper())
    c.restoreState()

    # ---------- HEADER ----------
    y = margin_top

    # Logo on top-left if provided
    logo_block_height = 22 * mm
    if logo_path:
        if logo_path.startswith("gs://"):
                # gs://bucket/path/to/logo.png
                # storage.download_to_path expects a key relative to the bucket (i.e. 'path/to/logo.png')
                # strip bucket name
                parts = logo_path[len("gs://"):].split("/", 1)
                if len(parts) == 2:
                    _, key = parts
                else:
                    key = parts[0] if parts else ""
                tmp_f = tempfile.NamedTemporaryFile(delete=False, suffix=Path(logo_path).suffix or ".png")
                tmp_f.close()
                tmp_file = tmp_f.name
                # download via storage abstraction
                storage.download_to_path(key, tmp_file)
                logo = Image.open(tmp_file).convert("RGBA")
        else:
            # local path or relative media path
            # if absolute filesystem path exists, use it; otherwise try MEDIA_ROOT parent + logo_path
            if os.path.exists(logo_path):
                logo = Image.open(logo_path).convert("RGBA")
            else:
                # try relative to MEDIA_ROOT parent (like earlier code used)
                candidate = (config.MEDIA_ROOT.parent / logo_path.lstrip("/")).as_posix()
                if os.path.exists(candidate):
                    logo = Image.open(candidate).convert("RGBA")
                else:
                    # fallback: try to open as-is (may be a URL — not handled here)
                    logo = Image.open(logo_path).convert("RGBA")
        try:
            logo_width = 28 * mm
            c.drawImage(
                logo,
                margin_left,
                y - logo_block_height + 4 * mm,
                width=logo_width,
                height=logo_block_height,
                preserveAspectRatio=True,
                mask="auto",
            )
            text_x = margin_left + logo_width + 5 * mm
        except Exception:
            # if logo fails to load, fall back to text-only
            text_x = margin_left
    else:
        text_x = margin_left

    # Studio name & contact
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(colors.HexColor("#4b3b5c"))  # deep muted purple
    c.drawString(text_x, y, studio_name)

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.black)
    y -= 14
    c.drawString(text_x, y, studio_address)
    y -= 12
    c.drawString(text_x, y, f"Phone: {studio_phone}")
    y -= 12
    c.drawString(text_x, y, f"Email: {studio_email}")
    y -= 12
    c.drawString(text_x, y, f"GSTIN: {gstin}")
    if effective_pan:
        y -= 12
        c.drawString(text_x, y, f"PAN: {effective_pan}")

    # Invoice meta on right
    meta_x = width - 80 * mm
    meta_y = margin_top

    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(colors.HexColor("#4b3b5c"))
    c.drawRightString(width - 25 * mm, meta_y, "TAX INVOICE")

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.black)
    meta_y -= 16
    inv_no = getattr(invoice, "invoice_number", None) or f"INV-{invoice.id}"
    c.drawString(meta_x, meta_y, f"Invoice #: {inv_no}")
    meta_y -= 12
    if invoice.issued_at:
        c.drawString(
            meta_x,
            meta_y,
            f"Issued: {invoice.issued_at.strftime('%d %b %Y')}",
        )
        meta_y -= 12
    if invoice.due_at:
        c.drawString(
            meta_x,
            meta_y,
            f"Due: {invoice.due_at.strftime('%d %b %Y')}",
        )
        meta_y -= 12
    c.drawString(meta_x, meta_y, f"Status: {invoice.status.value.title()}")

    # Optional QR code for payment (top-right box)
    if payment_qr_data:
        try:
            qr_size = 25 * mm
            qr_code = qr.QrCodeWidget(payment_qr_data)
            bounds = qr_code.getBounds()
            w = bounds[2] - bounds[0]
            h = bounds[3] - bounds[1]
            d = Drawing(qr_size, qr_size, transform=[qr_size / w, 0, 0, qr_size / h, 0, 0])
            d.add(qr_code)
            qr_x = width - 25 * mm - qr_size
            qr_y = margin_top - 50 * mm
            renderPDF.draw(d, c, qr_x, qr_y)

            c.setFont("Helvetica", 7)
            c.drawCentredString(
                qr_x + qr_size / 2,
                qr_y - 8,
                "Scan to pay",
            )
        except Exception:
            # Fail quietly if QR can't be generated
            pass

    # ---------- BILL TO ----------
    y -= 40
    c.setStrokeColorRGB(0.85, 0.78, 0.93)
    c.line(margin_left, y, width - margin_left, y)
    y -= 20

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#4b3b5c"))
    c.drawString(margin_left, y, "Bill To:")
    y -= 14
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.black)

    c.drawString(margin_left, y, client.full_name or "")
    y -= 12
    if client.phone:
        c.drawString(margin_left, y, f"Phone: {client.phone}")
        y -= 12
    if client.email:
        c.drawString(margin_left, y, f"Email: {client.email}")
        y -= 12
    if client.city or client.area:
        addr_line = (client.city or "") + (f" ({client.area})" if client.area else "")
        c.drawString(margin_left, y, addr_line)
        y -= 12

    # ---------- SESSION DETAILS ----------
    y -= 10
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#4b3b5c"))
    c.drawString(margin_left, y, "Session Details:")
    y -= 14
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.black)

    session_type_str = session.session_type.value.replace("_", " ").title()
    c.drawString(margin_left, y, f"Session: {session_type_str} (ID: {session.id})")
    y -= 12

    if session.scheduled_start:
        c.drawString(
            margin_left,
            y,
            f"Date: {session.scheduled_start.strftime('%d %b %Y, %H:%M')}",
        )
        y -= 12

    loc_type_str = session.location_type.value.replace("_", " ").title()
    c.drawString(margin_left, y, f"Location: {loc_type_str}")
    y -= 12
    if session.location_address:
        c.setFont("Helvetica", 9)
        c.drawString(margin_left, y, session.location_address[:90])
        y -= 12
        c.setFont("Helvetica", 10)

    # ---------- LINE ITEMS (INVENTORY) ----------
    y -= 10
    c.setStrokeColorRGB(0.85, 0.78, 0.93)
    c.line(margin_left, y, width - margin_left, y)
    y -= 18

    # Table headers
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor("#4b3b5c"))
    desc_x = margin_left
    qty_x = width - 70 * mm
    amount_x = width - 25 * mm

    c.drawString(desc_x, y, "Description")
    c.drawRightString(qty_x, y, "Qty")
    c.drawRightString(amount_x, y, "Amount (INR)")
    y -= 14
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.black)

    # Build line items
    line_items: List[tuple[str, float, Optional[int]]] = []

    # Base package line
    base_amount: float
    if package:
        base_amount = _num(getattr(package, "base_price", None))
        if base_amount == 0.0:
            # fall back to session.total_price or invoice.total_amount
            base_amount = (
                _num(getattr(session, "total_price", None))
                or _num(getattr(invoice, "total_amount", None))
            )
        desc = f"Package: {package.name}"
    else:
        base_amount = (
            _num(getattr(session, "total_price", None))
            or _num(getattr(invoice, "total_amount", None))
        )
        desc = "Photography session"

    line_items.append((desc, base_amount, 1))

    # Add-ons
    if session_add_ons:
        for sa in session_add_ons:
            ao: AddOn = sa.add_on  # type: ignore[assignment]
            qty = sa.quantity or 1
            amt = _num(sa.total_price or (sa.price_per_unit or 0) * qty)
            ao_desc = ao.name
            if qty != 1:
                ao_desc = f"{ao.name} x{qty}"
            line_items.append((f"Add-on: {ao_desc}", amt, qty))

    # Render line items
    subtotal = 0.0
    for desc, amount, qty in line_items:
        if y < 60 * mm:
            c.showPage()
            y = margin_top
            c.setFont("Helvetica", 10)
            c.setFillColor(colors.black)

        subtotal += amount
        c.drawString(desc_x, y, desc[:70])
        if qty is not None:
            c.drawRightString(qty_x, y, str(qty))
        c.drawRightString(amount_x, y, f"{amount:,.2f}")
        y -= 14

    y -= 8
    c.setStrokeColorRGB(0.85, 0.78, 0.93)
    c.line(margin_left, y, width - margin_left, y)
    y -= 16

    # ---------- TOTALS WITH GST (INCLUDED) ----------
    gst_rate = 0.06  # 6% GST included
    gst_amount = subtotal * gst_rate

    invoice_total = _num(invoice.total_amount)
    if invoice_total == 0.0:
        invoice_total = subtotal + gst_amount

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.black)
    c.drawRightString(amount_x, y, f"Subtotal (before GST): {subtotal:,.2f}")
    y -= 14

    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#4b3b5c"))
    c.drawRightString(
        amount_x,
        y,
        f"GST @ 6% (included): {gst_amount:,.2f}",
    )
    y -= 14

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.black)
    c.drawRightString(
        amount_x,
        y,
        f"Total (incl. GST): {invoice_total:,.2f}",
    )
    y -= 20

    # Payments
    paid = sum(
        _num(p.amount)
        for p in payments
        if p.status.value.lower() == "success"
    )
    balance = max(invoice_total - paid, 0.0)

    c.drawRightString(amount_x, y, f"Paid: {paid:,.2f}")
    y -= 14
    c.drawRightString(amount_x, y, f"Balance: {balance:,.2f}")
    y -= 24

    # ---------- PAYMENT LINES ----------
    if payments:
        if y < 70 * mm:
            c.showPage()
            y = margin_top

        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor("#4b3b5c"))
        c.drawString(margin_left, y, "Payments:")
        y -= 14
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.black)

        for p in payments:
            if y < 40 * mm:
                c.showPage()
                y = margin_top
                c.setFont("Helvetica", 9)
                c.setFillColor(colors.black)

            line = (
                f"{p.paid_at.strftime('%d %b %Y') if p.paid_at else ''} · "
                f"{p.gateway.value.title()} · "
                f"{p.status.value.title()} · "
                f"₹{_num(p.amount):,.2f}"
            )
            if p.gateway_ref:
                line += f" (Ref: {p.gateway_ref})"
            c.drawString(margin_left, y, line[:110])
            y -= 12

    # ---------- FOOTER ----------
    if y < 50 * mm:
        c.showPage()
        y = margin_top

    y = 40 * mm
    c.setFont("Helvetica-Oblique", 9)
    c.setFillColor(colors.black)
    c.drawString(
        margin_left,
        y,
        "Thank you for trusting Alluring Lens Studios with your precious memories.",
    )

    c.showPage()
    c.save()

    pdf = buffer.getvalue()
    buffer.close()
    return pdf
