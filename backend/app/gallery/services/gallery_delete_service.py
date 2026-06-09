from app.storage import storage
from app.gallery.services import gallery_service as crud


def delete_gallery_with_storage(db, gallery_id: str):
    gallery = crud.get_gallery(db, gallery_id)
    if not gallery:
        return False

    prefix = f"galleries/{gallery_id}/"

    # delete all files under prefix
    try:
        files = storage.list_files(prefix)
        for key in files:
            storage.delete(key)
    except Exception:
        pass

    # delete photos from DB
    photos = crud.list_photos(db, gallery_id)
    for p in photos:
        db.delete(p)

    # delete gallery
    db.delete(gallery)
    db.commit()

    return True
