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
async def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename)[1].lower() or ".png"
    gcs_blob_name = f"brand/logo{ext}"
    await file.seek(0)
    storage.save_fileobj(file.file, gcs_blob_name)
    dest = f"gs://{config.GCS_BUCKET_NAME}/{gcs_blob_name}"
    s = update_settings(db, {"logo_path": dest})
    return {"logo_url": s.logo_path}
