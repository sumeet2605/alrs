# backend/app/gallery/download_disk.py
from fastapi import Depends, HTTPException, status, Request, BackgroundTasks #type: ignore
from sqlalchemy.orm import Session #type: ignore
from app.database import get_db
from app.gallery.services import gallery_service as crud
from app.auth.services.dependencies import get_optional_current_user
from app.gallery.utils.tokens import verify_gallery_access_token
from pathlib import Path
from fastapi.responses import FileResponse #type:ignore
import zipfile, tempfile, os, time
from app import config
from app.gallery.services.paths import downloads_dir

def resolve_media_path(rel_path: str) -> Path | None:
    if not rel_path:
        return None
    rp = rel_path.lstrip("/")
    if rp.startswith("media/"):
        rp = rp[len("media/"):]
    return Path(config.MEDIA_ROOT) / rp

def cleanup_file_later(path: str, delay_seconds: int = 60):
    # naive cleanup: remove immediately (we'll schedule with BackgroundTasks)
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass

def build_zip_file_on_disk(file_list, zip_path: str):
    # file_list: List[tuple[abs_path, arcname]]
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for abs_path, arcname in file_list:
            if os.path.exists(abs_path):
                zf.write(abs_path, arcname)

def prepare_gallery_file_list(db: Session, gallery_id: str):
    photos = crud.list_photos(db, gallery_id) or []
    file_list = []
    for p in photos:
        rel = getattr(p, "path_original", None)
        abs_path_p = resolve_media_path(rel) # type: ignore
        if abs_path_p and abs_path_p.exists():
            file_list.append((str(abs_path_p), abs_path_p.name))
    return file_list

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

def download_gallery_disk(gallery_id: str, request, background_tasks: BackgroundTasks, db, current_user, file_list, filename):
    # 1) access check – make sure this isn’t returning 401/403!
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

    # Correct headers for download + correct media type
    return FileResponse(
        zip_path,
        filename=filename,
        media_type="application/zip",
    )


def prepare_gallery_file_list_by_size(db, gallery_id: str, size: str):
    photos = crud.list_photos(db, gallery_id)
    out = []
    gallery = crud.get_gallery(db, gallery_id)
    owner_id = str(gallery.owner_id)

    for p in photos:
        if size == "original":
            abs_path = (config.MEDIA_ROOT.parent / p.path_original.lstrip("/"))
            arcname = os.path.basename(abs_path)
        else:
            dst = downloads_dir(owner_id, str(gallery_id), size) / f"{p.file_id or p.id}.jpg"
            abs_path = dst
            base, _ = os.path.splitext(p.filename)
            arcname = f"{base}-{size}.jpg"
        out.append((str(abs_path), arcname))
    return out
