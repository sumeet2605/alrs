# backend/app/gallery/download_disk.py
from fastapi import Depends, HTTPException, status, Request, BackgroundTasks  # type: ignore
from sqlalchemy.orm import Session  # type: ignore
from pathlib import Path
from fastapi.responses import FileResponse  # type: ignore
import zipfile, tempfile, os
from typing import List, Tuple

from app.database import get_db
from app.gallery.services import gallery_service as crud
from app.auth.services.dependencies import get_optional_current_user
from app.gallery.utils.tokens import verify_gallery_access_token
from app import config
from app.gallery.utils.download_helper import ensure_cached_download_for_photo

# -------------------------------
# Helpers
# -------------------------------

def cleanup_file_later(path: str):
    """Best-effort cleanup (used via BackgroundTasks)."""
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


def build_zip_file_on_disk(file_list: List[Tuple[str, str]], zip_path: str) -> None:
    """
    file_list: list of tuples (local_abs_path, arcname_inside_zip)
    Assumes each local_abs_path points to a *local* readable file. We rely on
    ensure_cached_download_for_photo() to guarantee that (even for GCS/S3).
    """
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for abs_path, arcname in file_list:
            if abs_path and os.path.exists(abs_path):
                zf.write(abs_path, arcname)


def check_gallery_access(db: Session, gallery_id: str, request: Request, current_user):
    gallery = crud.get_gallery(db, gallery_id)
    if not gallery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery not found")

    allowed = False
    if current_user and getattr(gallery, "owner_id", None) == getattr(current_user, "id", None):
        allowed = True
    elif getattr(gallery, "is_public", False):
        allowed = True
    else:
        cookie_name = f"gallery_access_{gallery_id}"
        token = request.cookies.get(cookie_name)
        if token and verify_gallery_access_token(token, gallery_id):
            allowed = True

    if not allowed:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    return gallery


def _arcname_for_photo(photo, size: str, local_path: str) -> str:
    """
    Build a friendly filename for the zip entry.
    - Preserves base name from original filename if available.
    - For 'original', tries to keep the original extension from local_path or photo.ext.
    - For other sizes, uses '-{size}.jpg'.
    """
    # base from original filename
    base, orig_ext = os.path.splitext(photo.filename or f"photo-{photo.id}")

    if size == "original":
        # try to preserve original extension if we can detect it
        lp_ext = os.path.splitext(local_path)[1].lower()
        ext = lp_ext or (photo.ext or orig_ext) or ".jpg"
        return f"{base}{ext}"
    else:
        return f"{base}-{size}.jpg"


# -------------------------------
# Public functions used by routes
# -------------------------------

def download_gallery_disk(
    gallery_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session,
    current_user,
    file_list: List[Tuple[str, str]],
    filename: str,
):
    """
    Returns a FileResponse with a built zip file. `file_list` must contain
    local absolute paths (we don't care if storage is GCS/S3/local; callers
    must ensure local availability — we do that by calling ensure_cached_download_for_photo()).
    """
    # access check here as well (defense-in-depth)
    check_gallery_access(db, gallery_id, request, current_user)

    if not file_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No available files to download")

    tmpdir = tempfile.mkdtemp(prefix=f"gallery_{gallery_id}_")
    zip_path = os.path.join(tmpdir, f"gallery_{gallery_id}.zip")
    build_zip_file_on_disk(file_list, zip_path)

    def _cleanup():
        try:
            if os.path.exists(zip_path):
                os.remove(zip_path)
            try:
                os.rmdir(tmpdir)
            except Exception:
                pass
        except Exception:
            pass

    background_tasks.add_task(_cleanup)

    return FileResponse(
        zip_path,
        filename=filename,
        media_type="application/zip",
    )


def prepare_gallery_file_list_by_size(db: Session, gallery_id: str, size: str) -> List[Tuple[str, str]]:
    """
    Build a list of (local_abs_path, arcname) for all photos in a gallery for the given size.
    Works for local and cloud backends because it uses ensure_cached_download_for_photo()
    to produce a local cached file.

    size: 'original' | 'large' | 'medium' | 'web'
    """
    photos = crud.list_photos(db, gallery_id) or []
    out: List[Tuple[str, str]] = []

    for p in photos:
        try:
            local_abs_path = ensure_cached_download_for_photo(db, p, size)
            if not local_abs_path or not os.path.exists(local_abs_path):
                # skip silently if the file isn't available
                continue
            arcname = _arcname_for_photo(p, size, local_abs_path)
            out.append((local_abs_path, arcname))
        except Exception:
            # Skip problematic photos rather than failing the whole zip
            continue

    return out


# (Optional) If you still use this anywhere: convert it to use the helper too.
def prepare_gallery_file_list(db: Session, gallery_id: str):
    """
    Legacy helper (originals only). Kept for compatibility.
    Prefer prepare_gallery_file_list_by_size(..., size="original").
    """
    photos = crud.list_photos(db, gallery_id) or []
    file_list: List[Tuple[str, str]] = []

    for p in photos:
        try:
            local_abs_path = ensure_cached_download_for_photo(db, p, "original")
            if not local_abs_path or not os.path.exists(local_abs_path):
                continue
            arcname = _arcname_for_photo(p, "original", local_abs_path)
            file_list.append((local_abs_path, arcname))
        except Exception:
            continue

    return file_list
