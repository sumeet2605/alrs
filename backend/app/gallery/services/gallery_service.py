# backend/app/crud.py
from sqlalchemy.orm import Session  #type: ignore
from typing import List, Optional, Dict, Any
from app.gallery.models import gallery_model as models 
from datetime import datetime
import uuid
from app.auth.utils.password_hasher import get_password_hash, verify_password as verify_plain_password
from pathlib import Path
from app import config, images

def file_path_to_web_path(p: Optional[str]) -> Optional[str]:
    """
    Convert a stored filesystem path (or already relative web path) into the web-accessible path.
    - If p is None -> returns None
    - If p already begins with '/media' -> return as-is
    - If p lies under config.MEDIA_ROOT -> return '/media/<relative path>'
    - Otherwise return p (best effort, may be absolute filesystem path which frontend can't load)
    """
    if not p:
        return None
    try:
        # already a web path
        if isinstance(p, str) and p.startswith("/media"):
            return p
        media_root = Path(str(config.MEDIA_ROOT)).resolve()
        p_path = Path(p).resolve()
        # if file under media root -> convert to /media/...
        try:
            rel = p_path.relative_to(media_root)
            return f"/media/{rel.as_posix()}"
        except Exception:
            # not under media root; fallback to return p as-is
            return p
    except Exception:
        return p


def set_gallery_password(db:Session, gallery_id:str, owner_id:str, password: Optional[str]) -> models.Gallery:
    gallery = db.query(models.Gallery).filter(models.Gallery.id == gallery_id, models.Gallery.owner_id == owner_id).first()
    if not gallery:
        raise ValueError("Gallery not found or not owned by user")
    if password:
        gallery.password_hash = get_password_hash(password)
    else:
        gallery.password_hash = None
    db.add(gallery)
    db.commit()
    db.refresh(gallery)
    return gallery


def verify_gallery_password(db: Session, gallery_id: str, password: str) -> bool:
    gallery = db.query(models.Gallery).filter(models.Gallery.id == gallery_id).first()
    if not gallery:
        return False
    if not gallery.password_hash:
        return True  # no password required
    return verify_plain_password(password, gallery.password_hash)

def create_gallery(db: Session, owner_id: str, title: str, description: Optional[str] = None, is_public: bool = False):
    g = models.Gallery(owner_id=owner_id, title=title, description=description, is_public=is_public)
    db.add(g)
    db.commit()
    db.refresh(g)
    return g

def get_gallery(db:Session, gallery_id:str):
    return db.query(models.Gallery).filter(models.Gallery.id == gallery_id).first()

def list_galleries(db:Session) -> List[models.Gallery]:
    return db.query(models.Gallery).order_by(models.Gallery.created_at.desc()).all()

def get_galleries_for_owner(db: Session, owner_id: str) -> List[models.Gallery]:
    return db.query(models.Gallery).filter(models.Gallery.owner_id == owner_id).order_by(models.Gallery.created_at.desc()).all()

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
                "path_original": cover.path_original,
                "path_preview": cover.path_preview,
                "path_thumb": cover.path_thumb,
                "width": cover.width,
                "height": cover.height,
                "is_cover": bool(cover.is_cover),
            }
            # Prefer thumb -> preview -> original (converted to web path)
            cover_url = (
                file_path_to_web_path(cover.path_thumb)
                or file_path_to_web_path(cover.path_preview)
                or file_path_to_web_path(cover.path_original)
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
    if file_id is None:
        file_id = str(uuid.uuid4())
    p = models.Photo(gallery_id=gallery_id, filename=filename, ext=ext, path_original=path_original)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

def list_photos(db: Session, gallery_id: str):
    return db.query(models.Photo).filter(models.Photo.gallery_id == gallery_id).order_by(models.Photo.order_index).all()
