# app/gallery/download_helpers.py
from __future__ import annotations
from pathlib import Path
import os, tempfile
from typing import Tuple, Literal, Optional
from sqlalchemy.orm import Session  # type: ignore
from app import config
from app.gallery.services.paths import downloads_dir
from app.gallery.models.gallery_model import Photo
from app.images import make_size, make_original_with_watermark
from app.storage import storage



StorageMode = Literal["local", "gcs"]

def _storage_mode() -> StorageMode:
    return "gcs" if getattr(config, "STORAGE_BACKEND", "").lower() == "gcs" else "local"

def _photo_original_key(owner_id: str, gallery_id: str, file_id: str, ext: str) -> str:
    return f"{gallery_id}/original/{file_id}"

def _photo_preset_key(owner_id: str, gallery_id: str, size: str, file_id: str) -> str:
    # store presets as jpgs
    return f"{gallery_id}/downloads/{size}/{file_id}"

def ensure_cached_download_for_photo(db: Session, photo, size: str) -> Tuple[StorageMode, str]:
    """
    Ensure a downloadable artifact for (photo, size) exists.
    Returns:
      ("local", /abs/path/to/file)  -> caller should FileResponse this
      ("gcs",   gcs_object_key)     -> caller should redirect to signed URL

    Raises FileNotFoundError if the original cannot be found, or size invalid.
    """
    mode = _storage_mode()
    print(mode)
    gallery = photo.gallery  # if relationship available; otherwise fetch owner_id/gid directly
    owner_id = str(getattr(gallery, "owner_id", None) or getattr(photo, "owner_id"))
    gallery_id = str(getattr(photo, "gallery_id"))
    file_id = str(getattr(photo, "filename") or getattr(photo, "id"))
    ext = photo.ext or os.path.splitext(photo.filename or "")[1] or ".jpg"
    # print(gallery_id, owner_id, file_id, ext)

    if size not in config.DOWNLOAD_SIZES:  # e.g. {"original": None, "large": 2048, ...}
        raise ValueError("Unsupported size")

    # --- GCS path ---
    orig_key = _photo_original_key(owner_id, gallery_id, file_id, ext)
    print(orig_key)
    if size == "original":
        # just ensure it exists in bucket
        print(storage.exists(orig_key))
        if not storage.exists(orig_key):
            raise FileNotFoundError("Original not in bucket")
        print(89)
        return ("gcs", orig_key)

    # preset in bucket
    preset_key = _photo_preset_key(owner_id, gallery_id, size, file_id)
    print(preset_key, "92")
    if not storage.exists(preset_key):
        # generate in temp, then upload
        # 1) download original to temp
        if not storage.exists(orig_key):
            raise FileNotFoundError("Original not in bucket")
        with tempfile.TemporaryDirectory() as td:
            src_path = os.path.join(td, f"orig{ext or '.jpg'}")
            with open(src_path, "wb") as f:
                f.write(storage.read_bytes(orig_key))

            out_path = os.path.join(td, f"{file_id}.jpg")
            longest = config.DOWNLOAD_SIZES[size]
            make_size(src_path, out_path, int(longest or 0), db)

            # upload preset
            with open(out_path, "rb") as f:
                storage.save_fileobj(f, preset_key)

    return ("gcs", preset_key)
