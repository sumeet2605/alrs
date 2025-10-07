# app/brand/service.py
from sqlalchemy.orm import Session #type: ignore
from .watermark import BrandSettings

def get_settings(db: Session) -> BrandSettings:
    s = db.query(BrandSettings).first()
    if not s:
        s = BrandSettings()
        db.add(s); db.commit(); db.refresh(s)
    return s

def update_settings(db: Session, data: dict) -> BrandSettings:
    s = get_settings(db)
    for k, v in data.items():
        if hasattr(s, k): setattr(s, k, v)
    db.add(s); db.commit(); db.refresh(s)
    return s
