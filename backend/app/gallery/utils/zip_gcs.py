# backend/app/gallery/utils/zip_gcs.py
from __future__ import annotations
from typing import List, Tuple
from sqlalchemy.orm import Session #type: ignore
from app.gallery.services import gallery_service as crud
from app.storage import storage
import io, os, time
from app.gallery.utils.download_helper import ensure_cached_download_for_photo

# Build a deterministic key for the ZIP
def zip_key(gallery_id: str, size: str) -> str:
    # e.g. zips/1/gallery-1-large.zip
    return f"zips/{gallery_id}/gallery-{gallery_id}-{size}.zip"

def ensure_zip_in_gcs(db: Session, gallery_id: str, size: str, *, force_rebuild: bool = True) -> str:
    """
    Ensures a ZIP of the gallery for the given size exists in GCS.
    Returns the GCS object key.
    Strategy:
      - If object exists and not forcing: reuse it.
      - Else: build zip in-memory and upload.
    """
    key = zip_key(gallery_id, size)
    # print(key)
    # print()
    if not force_rebuild and storage.exists(key):
        return key

    # Build the list of (gcs_key, arcname)
    photos = crud.list_photos(db, gallery_id) or []
    entries: List[Tuple[str, str]] = []
    for p in photos:
        # Your sized image keys (since you removed local FS & owner_id):
        # originals:   "{gallery}/original/{filename}"
        # downloads:   "{gallery}/downloads/{size}/{base}.jpg"
        backend, ref = ensure_cached_download_for_photo(db, p, size)
        # print(ref)
        if size == "original":
            arc = os.path.basename(p.filename)
        else:
            base, _ = os.path.splitext(p.filename or f"photo-{p.id}")
            arc = f"{base}-{size}.jpg"
        entries.append((ref, arc))

    # Build zip in-memory and upload to GCS
    buf = io.BytesIO()
    import zipfile
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for gcs_key, arcname in entries:
            if not storage.exists(gcs_key):
                # if eager gen missed something, skip or you can generate lazily here
                continue
            try:
                data = storage.read_bytes(gcs_key)
                zf.writestr(arcname, data)
            except Exception:
                # skip corrupt entries gracefully
                continue

    buf.seek(0)
    storage.write_bytes(key, buf.read())
    return key


def signed_zip_url(db: Session, gallery_id: str, size: str, *, filename: str, expires_seconds: int = 600) -> str:
    key = ensure_zip_in_gcs(db, gallery_id, size)
    # We want a friendly filename in the browser download
    url = storage.signed_url(key, expires_seconds, response_disposition=None)
    # Some clients respect the Content-Disposition in the signed URL; append if supported by driver:
    # For GCS signed_url, we can’t change disposition post-sign easily,
    # but you could pre-set blob.content_disposition on the object.
    return url
