from datetime import datetime, timedelta
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
from app.database import engine
from app.gallery.models.gallery_model import Gallery
from app.storage import storage

REMINDER_BEFORE_DAYS = 3
SOFT_EXPIRE_DAYS = 30
HARD_DELETE_AFTER_DAYS = 7


def cleanup_expired_galleries():
    now = datetime.utcnow()

    reminder_start = now - timedelta(days=SOFT_EXPIRE_DAYS - REMINDER_BEFORE_DAYS)
    reminder_end = now - timedelta(days=SOFT_EXPIRE_DAYS - REMINDER_BEFORE_DAYS - 1)

    soft_cutoff = now - timedelta(days=SOFT_EXPIRE_DAYS)
    hard_cutoff = now - timedelta(days=SOFT_EXPIRE_DAYS + HARD_DELETE_AFTER_DAYS)

    result = {
        "reminders": [],
        "soft_expired": [],
        "hard_deleted": []
    }

    with Session(engine) as session:

        # 🔔 Day 27 reminder
        reminder_galleries = session.exec(
            select(Gallery)
            .where(Gallery.status == "active")
            .where(Gallery.created_at >= reminder_start)
            .where(Gallery.created_at < reminder_end)
        ).all()

        for gallery in reminder_galleries:
            result["reminders"].append({
                "id": gallery.id,
                "title": gallery.title,
                "owner_id": gallery.owner_id
            })

        # 🟡 Day 30 soft expire
        to_soft_expire = session.exec(
            select(Gallery)
            .where(Gallery.status == "active")
            .where(Gallery.created_at < soft_cutoff)
        ).all()

        for gallery in to_soft_expire:
            gallery.status = "expired"
            gallery.expired_at = now
            result["soft_expired"].append(gallery.id)

        # 🔴 Day 37 hard delete
        to_delete = session.exec(
            select(Gallery)
            .where(Gallery.status == "expired")
            .where(Gallery.created_at < hard_cutoff)
            .options(selectinload(Gallery.photos))
        ).all()

        for gallery in to_delete:
            try:
                for photo in gallery.photos:
                    if photo.path_original:
                        storage.delete(photo.path_original)
                    if photo.path_preview:
                        storage.delete(photo.path_preview)
                    if photo.path_thumb:
                        storage.delete(photo.path_thumb)

                session.delete(gallery)
                result["hard_deleted"].append(gallery.id)

            except Exception:
                session.rollback()

        session.commit()

    return result


if __name__ == "__main__":
    cleanup_expired_galleries()
