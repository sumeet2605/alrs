# app/brand/controllers.py
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from .service import get_settings, update_settings
from app.storage import storage
import os

router = APIRouter(prefix="/api/brand", tags=["Brand"])


@router.get("")
def read_brand(db: Session = Depends(get_db)):
    s = get_settings(db)
    if not s:
        return {}

    return {
        "logo_path": getattr(s, "logo_path", None),
        "primary_color": getattr(s, "primary_color", None),
        "secondary_color": getattr(s, "secondary_color", None),
        "accent_color": getattr(s, "accent_color", None),
        "font_family": getattr(s, "font_family", None),
        "theme_mode": getattr(s, "theme_mode", None),
    }


@router.put("")
def write_brand(payload: dict, db: Session = Depends(get_db)):
    allowed_fields = {
        "primary_color",
        "secondary_color",
        "accent_color",
        "font_family",
        "theme_mode",
    }

    clean_payload = {k: v for k, v in payload.items() if k in allowed_fields}

    s = update_settings(db, clean_payload)

    return {
        "primary_color": getattr(s, "primary_color", None),
        "secondary_color": getattr(s, "secondary_color", None),
        "accent_color": getattr(s, "accent_color", None),
        "font_family": getattr(s, "font_family", None),
        "theme_mode": getattr(s, "theme_mode", None),
    }


@router.post("/logo", status_code=201)
async def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename)[1].lower() or ".png"
    key = f"branding/logo{ext}"

    await file.seek(0)
    storage.save_fileobj(file.file, key)

    s = update_settings(db, {"logo_path": key})

    return {
        "logo_url": storage.url_for(key)
    }
