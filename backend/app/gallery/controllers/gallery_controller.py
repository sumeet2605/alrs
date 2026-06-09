# backend/app/routes/galleries.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, Response, Request
from fastapi.responses import StreamingResponse
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db
import os
import uuid
from datetime import datetime

from app.gallery.schemas.gallery_schema import GalleryCreate
from app.gallery.models.gallery_model import Gallery, Photo
from app.gallery.services import gallery_service as crud
from app.gallery.services.gallery_download_service import stream_gallery_zip
from app.auth.services.dependencies import get_current_user, get_optional_current_user
from app.gallery.utils.tokens import create_gallery_access_token, verify_gallery_access_token
from app.storage import storage

router = APIRouter(tags=["Gallery"])

# ========================
# Gallery CRUD
# ========================

@router.post("/galleries", status_code=201)
def create_gallery(payload: GalleryCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    g = crud.create_gallery(
        db,
        owner_id=user.id,
        title=payload.title,
        description=payload.description,
        is_public=payload.is_public,
    )
    return g


@router.get("/galleries")
def list_galleries(db: Session = Depends(get_db), user=Depends(get_current_user)):
    out = crud.get_galleries_for_owner_with_cover(db, user.id)
    return {"galleries": out}


@router.delete("/galleries/{gallery_id}")
def delete_gallery(
    gallery_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    gallery = db.query(Gallery).filter(Gallery.id == gallery_id).first()

    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    if gallery.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    photos = db.query(Photo).filter(Photo.gallery_id == gallery_id).all()

    # Delete files from storage
    for photo in photos:
        if photo.path_original:
            try:
                storage.delete(photo.path_original)
            except Exception:
                pass

    # Optional: delete whole prefix if storage supports it
    try:
        prefix = f"galleries/{gallery_id}/"
        storage.delete_prefix(prefix)
    except Exception:
        pass

    # Delete DB records
    db.query(Photo).filter(Photo.gallery_id == gallery_id).delete()
    db.delete(gallery)
    db.commit()

    return {"detail": "Gallery deleted"}


# ========================
# Expiry + Auto Cleanup
# ========================

@router.post("/galleries/{gallery_id}/expire")
def expire_gallery(
    gallery_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    gallery = db.query(Gallery).filter(Gallery.id == gallery_id).first()

    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    if gallery.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    gallery.status = "expired"
    gallery.expired_at = datetime.utcnow()
    db.commit()

    return {"detail": "Gallery marked as expired"}


@router.post("/admin/cleanup-expired")
def cleanup_expired_galleries(db: Session = Depends(get_db)):
    expired = db.query(Gallery).filter(Gallery.status == "expired").all()

    deleted = 0

    for gallery in expired:
        photos = db.query(Photo).filter(Photo.gallery_id == gallery.id).all()

        for photo in photos:
            if photo.path_original:
                try:
                    storage.delete(photo.path_original)
                except Exception:
                    pass

        try:
            prefix = f"galleries/{gallery.id}/"
            storage.delete_prefix(prefix)
        except Exception:
            pass

        db.query(Photo).filter(Photo.gallery_id == gallery.id).delete()
        db.delete(gallery)
        deleted += 1

    db.commit()

    return {"deleted_galleries": deleted}


# ========================
# Upload Logic (Original Only)
# ========================

@router.post("/galleries/{gallery_id}/photos", status_code=201)
async def upload_photos(
    gallery_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    created = []

    for upload in files:
        ext = os.path.splitext(upload.filename)[1].lower() or ".jpg"
        file_id = str(uuid.uuid4())

        key_original = f"galleries/{gallery_id}/originals/{file_id}{ext}"

        storage.save_fileobj(upload.file, key_original)

        p = crud.create_photo(
            db,
            gallery_id=gallery_id,
            filename=upload.filename,
            ext=ext,
            path_original=key_original,
            file_id=file_id,
        )

        created.append(
            {
                "id": str(p.id),
                "file_id": p.file_id,
                "filename": p.filename,
                "path_original": storage.url_for(key_original),
            }
        )

    return {"photos": created}


# ========================
# (rest unchanged below)
# ========================
