# backend/app/crud.py
from sqlalchemy.orm import Session  #type: ignore
from typing import List, Optional
from app.gallery.models import gallery_model as models 
from datetime import datetime
import uuid

def create_gallery(db: Session, owner_id: str, title: str, description: Optional[str] = None, is_public: bool = False):
    g = models.Gallery(owner_id=owner_id, title=title, description=description, is_public=is_public)
    db.add(g)
    db.commit()
    db.refresh(g)
    return g

def get_galleries_for_owner(db: Session, owner_id: str) -> List[models.Gallery]:
    return db.query(models.Gallery).filter(models.Gallery.owner_id == owner_id).order_by(models.Gallery.created_at.desc()).all()

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
