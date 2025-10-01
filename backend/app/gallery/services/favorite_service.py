# app/gallery/services/favorite_service.py
from sqlalchemy.orm import Session #type: ignore
from app.gallery.models.favorite_model import Favorite
from app.gallery.models.gallery_model import Gallery
from app.gallery.models.gallery_model import Photo

DEFAULT_FAVORITES_LIMIT = 50

def get_effective_limit(gallery: Gallery) -> int:
    return gallery.favorites_limit if (gallery.favorites_limit is not None and gallery.favorites_limit > 0) else DEFAULT_FAVORITES_LIMIT

def list_favorites(db: Session, gallery_id: int, selector: str):
    return db.query(Favorite).filter(Favorite.gallery_id==gallery_id, Favorite.selector==selector).all()

def count_favorites(db: Session, gallery_id: int, selector: str) -> int:
    return db.query(Favorite).filter(Favorite.gallery_id==gallery_id, Favorite.selector==selector).count()

def add_favorite(db: Session, gallery: Gallery, photo_id: int, selector: str):
    # ensure photo belongs to gallery
    p = db.query(Photo).filter(Photo.id==photo_id, Photo.gallery_id==gallery.id).first()
    if not p:
        return None, "Photo not found in gallery"

    # enforce limit
    current = count_favorites(db, gallery.id, selector)
    if current >= get_effective_limit(gallery):
        return None, "Favorites limit reached"

    fav = Favorite(gallery_id=gallery.id, photo_id=photo_id, selector=selector)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav, None

def remove_favorite(db: Session, gallery_id: int, photo_id: int, selector: str) -> bool:
    q = db.query(Favorite).filter(
        Favorite.gallery_id==gallery_id,
        Favorite.photo_id==photo_id,
        Favorite.selector==selector
    )
    if q.first():
        q.delete()
        db.commit()
        return True
    return False

def set_gallery_favorites_limit(db: Session, gallery: Gallery, limit: int | None):
    gallery.favorites_limit = limit if (limit is None or limit >= 0) else None
    db.add(gallery)
    db.commit()
    db.refresh(gallery)
    return gallery
