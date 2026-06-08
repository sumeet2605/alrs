from datetime import datetime, timedelta
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
from app.database import engine
from app.gallery.models.gallery_model import Gallery
from app.storage import storage

EXPIRY_DAYS = 30


def cleanup_expired_galleries():
    cutoff = datetime.utcnow() - timedelta(days=EXPIRY_DAYS)

    with Session(engine) as session:
        statement = (
            select(Gallery)
            .where(Gallery.created_at < cutoff)
            .options(selectinload(Gallery.photos))
        )

        expired_galleries = session.exec(statement).all()

        for gallery in expired_galleries:
            try:
                for photo in gallery.photos:
                    if photo.path_original:
                        storage.delete(photo.path_original)
                    if photo.path_preview:
                        storage.delete(photo.path_preview)
                    if photo.path_thumb:
                        storage.delete(photo.path_thumb)

                session.delete(gallery)
                print(f"Deleted expired gallery: {gallery.id}")

            except Exception as e:
                session.rollback()
                print(f"Error deleting gallery {gallery.id}: {e}")

        session.commit()


if __name__ == "__main__":
    cleanup_expired_galleries()
