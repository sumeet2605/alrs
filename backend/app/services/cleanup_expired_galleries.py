from datetime import datetime, timedelta
from sqlmodel import Session, select
from app.database import engine
from app.models import Gallery  # adjust if model path differs
from app.storage import storage

EXPIRY_DAYS = 30


def cleanup_expired_galleries():
    cutoff = datetime.utcnow() - timedelta(days=EXPIRY_DAYS)

    with Session(engine) as session:
        statement = select(Gallery).where(Gallery.created_at < cutoff)
        expired_galleries = session.exec(statement).all()

        for gallery in expired_galleries:
            try:
                # delete all associated files from storage
                for photo in gallery.photos:
                    storage.client.delete_object(
                        Bucket=storage.bucket_name,
                        Key=photo.storage_key,
                    )

                session.delete(gallery)
                print(f"Deleted expired gallery: {gallery.id}")
            except Exception as e:
                print(f"Error deleting gallery {gallery.id}: {e}")

        session.commit()


if __name__ == "__main__":
    cleanup_expired_galleries()
