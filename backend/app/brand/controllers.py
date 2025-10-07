# app/brand/controllers.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException #type: ignore
from sqlalchemy.orm import Session #type: ignore
from app.database import get_db
from .service import get_settings, update_settings
from app import config
from pathlib import Path
import shutil, os
from app.storage import storage

router = APIRouter(prefix="/api/brand", tags=["Brand"])

@router.get("")
def read_brand(db: Session = Depends(get_db)):
    return get_settings(db).__dict__

@router.put("")
def write_brand(payload: dict, db: Session = Depends(get_db)):
    return update_settings(db, payload).__dict__

@router.post("/logo", status_code=201)
def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename)[1].lower() or ".png"
    dest = storage.save_fileobj(file, f"brand/logo{ext}")
    with open(dest, "wb") as f: shutil.copyfileobj(file.file, f)
    s = update_settings(db, {"logo_path": f"/media/brand/logo{ext}"})
    return {"logo_url": s.logo_path}
