# backend/app/crud.py
from sqlalchemy import case, true, text # type: ignore
from sqlalchemy.orm import Session  #type: ignore
from typing import List, Optional, Dict, Any
from app.gallery.models import gallery_model as models 
from datetime import datetime, timezone, timedelta
import uuid
from app.auth.utils.password_hasher import get_password_hash, verify_password as verify_plain_password
from pathlib import Path
from app import config, images
from app.gallery.utils.urls import url_from_path

def set_gallery_password(db:Session, gallery_id:str, owner_id:str, password: Optional[str], expires_seconds: Optional[int], expires_at: Optional[datetime]) -> models.Gallery:
    gallery = db.query(models.Gallery).filter(models.Gallery.id == gallery_id, models.Gallery.owner_id == owner_id).first()
    if not gallery:
        raise ValueError("Gallery not found or not owned by user")
    if password:
        gallery.password_hash = get_password_hash(password)
        gallery.is_public = True
        if expires_at:
            gallery.password_expires_at = expires_at.astimezone(timezone.utc)
        elif expires_seconds:
            gallery.password_expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_seconds))
        else:
            gallery.password_expires_at = None
    else:
        gallery.password_hash = None
        gallery.password_expires_at = None
    db.add(gallery)
    db.commit()
    db.refresh(gallery)
    return gallery


def verify_gallery_password(db: Session, gallery_id: str, password: str) -> bool:
    gallery = db.query(models.Gallery).filter(models.Gallery.id == gallery_id).first()
    if not gallery:
        return False
    if not gallery.password_hash:
        return False  # no password required
    return verify_plain_password(password, gallery.password_hash)

def create_gallery(db: Session, owner_id: str, title: str, description: Optional[str] = None, is_public: bool = False):
    g = models.Gallery(owner_id=owner_id, title=title, description=description, is_public=is_public)
    db.add(g)
    db.commit()
    db.refresh(g)
    return g

def get_gallery(db:Session, gallery_id:str):
    return db.query(models.Gallery).filter(models.Gallery.id == gallery_id).first()

def delete_gallery(db: Session, gallery_id: str):
    gallery = db.query(models.Gallery).filter(models.Gallery.id == gallery_id).first()
    if not gallery:
        return False
    db.delete(gallery)
    db.commit()
    return True

def list_galleries(db:Session) -> List[models.Gallery]:
    return db.query(models.Gallery).order_by(models.Gallery.created_at.desc()).all()

def get_galleries_for_owner(db: Session, owner_id: str) -> List[models.Gallery]:
    return db.query(models.Gallery).order_by(models.Gallery.created_at.desc()).all()

def get_galleries_for_owner_with_cover(db: Session, owner_id: str) -> List[models.Gallery]:
    galleries = get_galleries_for_owner(db, owner_id)
    out = []
    for g in galleries:
        cover = db.query(models.Photo).filter(models.Photo.gallery_id == g.id, models.Photo.is_cover == True).first()
        if not cover:
            # fallback: pick the earliest uploaded photo in the gallery
            cover = db.query(models.Photo).filter(models.Photo.gallery_id == g.id).order_by(models.Photo.uploaded_at.asc()).first()
        cover_photo_obj = None
        cover_url = None
        if cover:
            cover_photo_obj = {
                "id": str(cover.id),
                "file_id": getattr(cover, "file_id", None),
                "filename": cover.filename,
                "path_original": (cover.path_original),
                "path_preview": (cover.path_preview),
                "path_thumb": (cover.path_thumb),
                "width": cover.width,
                "height": cover.height,
                "is_cover": bool(cover.is_cover),
            }
            # Prefer thumb -> preview -> original (converted to web path)
            cover_url = (
                url_from_path(cover.path_thumb)
                or url_from_path(cover.path_preview)
                or url_from_path(cover.path_original)
            )

        # Build gallery dict. If crud returned ORM objects, convert essential fields.
        # Try to be minimal and not rely on Pydantic models here.
        gallery_obj = {
            "id": str(g.id),
            "title": getattr(g, "title", None),
            "description": getattr(g, "description", None),
            "is_public": bool(getattr(g, "is_public", False)),
            "created_at": getattr(g, "created_at", None),
            # include the cover details
            "cover_photo": cover_photo_obj,
            "cover_url": cover_url,
        }
        out.append(gallery_obj)

    return out



def create_photo(db: Session, gallery_id: str, filename: str, ext: str, path_original: str, file_id: str | None = None):
    """
    Create a photo record. This function is idempotent when called with an existing
    `file_id` or `path_original` — it will return an existing Photo if found rather
    than creating a duplicate.
    """
    # Normalize inputs
    file_id = file_id or None

    # If file_id provided, prefer that for idempotency check
    if file_id is not None:
        existing = db.query(models.Photo).filter(models.Photo.file_id == file_id).first()
        if existing:
            return existing

    # Fallback: try to find by exact original path (useful when file_id not provided)
    if path_original:
        existing_by_path = db.query(models.Photo).filter(models.Photo.path_original == path_original, models.Photo.gallery_id == gallery_id).first()
        if existing_by_path:
            return existing_by_path

    # Not found -> create new record (use provided file_id if present)
    if file_id is None:
        file_id = str(uuid.uuid4())

    p = models.Photo(gallery_id=gallery_id, filename=filename, ext=ext, path_original=path_original, file_id=file_id)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

def list_photos(db: Session, gallery_id: str):
    return db.query(models.Photo).filter(models.Photo.gallery_id == gallery_id).order_by(models.Photo.order_index).all()


def list_photos_paginated(db: Session, gallery_id: str, offset: int = 0, limit: int = 10):
    """
    Return (items, total) for photos in a gallery using offset/limit pagination.
    """
    q = db.query(models.Photo).filter(models.Photo.gallery_id == gallery_id).order_by(models.Photo.id)
    total = q.count()
    if offset == 0:
        cover_priority = case(
            (models.Photo.is_cover == true(), 0), 
            else_=1
        )
        q = q.order_by(cover_priority, models.Photo.id)
    else:
        # For all other pages, just sort by ID
        q = q.order_by(models.Photo.id)
    items = q.offset(offset).limit(limit).all()
    return items, total


def get_photo(db: Session, gallery_id: str, photo_id: str):
    return db.query(models.Photo).filter(models.Photo.id == photo_id).first()