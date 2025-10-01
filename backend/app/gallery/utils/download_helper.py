# app/gallery/download_helpers.py
from __future__ import annotations
from pathlib import Path
import os

from sqlalchemy.orm import Session  # type: ignore

from app import config
from app.gallery.models.gallery_model import Photo
from app.images import make_size, make_original_with_watermark

# Map your public query names to pixel longest-edge sizes.
# Keep 'original' special-cased.
DOWNLOAD_SIZES = {
    "original": None,   # special => watermark same size, do not resize
    "large": 2048,
    "medium": 1200,
    "web": 1024,
}

def resolve_abs_from_rel(rel_path: str) -> str:
    """
    Convert stored relative path (/media/...) to absolute filesystem path.
    """
    return str(config.MEDIA_ROOT.parent / rel_path.lstrip("/"))

def ensure_cached_download_for_photo(db: Session, photo: Photo, size: str) -> str:
    """
    Return an absolute file path to the ready-to-serve download for (photo, size).
    Generates and caches it if not present.

    - original => uses make_original_with_watermark (non-destructive)
    - other sizes => uses make_size(longest=N)
    """
    size = (size or "original").lower()
    if size not in DOWNLOAD_SIZES:
        raise ValueError(f"Unknown size '{size}'")

    # Originals are saved by you at photo.path_original (relative /media/...)
    rel_original = photo.path_original
    if not rel_original:
        raise FileNotFoundError("Photo original path missing")

    abs_original = resolve_abs_from_rel(rel_original)

    # Cache destination: /media/{owner}/{gallery}/downloads/{size}/{file_id}.jpg
    owner_id = str(photo.gallery.owner_id) if photo.gallery and photo.gallery.owner_id is not None else "unknown"
    gallery_id = str(photo.gallery_id)
    file_id = getattr(photo, "file_id", None) or f"{photo.id}"

    dst_rel = f"/media/{owner_id}/{gallery_id}/downloads/{size}/{file_id}.jpg"
    dst_abs = resolve_abs_from_rel(dst_rel)

    # Already exists?
    if os.path.exists(dst_abs):
        return dst_abs

    # Ensure folder
    Path(dst_abs).parent.mkdir(parents=True, exist_ok=True)

    # Generate
    if DOWNLOAD_SIZES[size] is None:
        # original => watermark only, no resize
        make_original_with_watermark(abs_original, dst_abs, db=db)
    else:
        longest = DOWNLOAD_SIZES[size]
        make_size(abs_original, dst_abs, longest, db=db)

    return dst_abs
