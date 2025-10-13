# backend/app/routes/galleries.py
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException, status, Response, Request, Query  # type:ignore
from typing import List, Optional
from sqlalchemy.orm import Session  # type:ignore
from app.database import get_db
from app import config, images
import shutil
import os
import uuid
from app.gallery.schemas.gallery_schema import GalleryCreate
from app.gallery.models.gallery_model import Gallery, Photo
from app.gallery.services import gallery_service as crud
from app.auth.services.dependencies import get_current_user, get_optional_current_user
from app.auth.utils.password_hasher import get_password_hash as hash_password, verify_password
from app.gallery.utils.tokens import create_gallery_access_token, verify_gallery_access_token
from pathlib import Path
from app.gallery.utils.download import check_gallery_access
from app.gallery.services.paths import previews_dir, thumbs_dir, downloads_dir
from fastapi.responses import FileResponse, StreamingResponse #type: ignore
from app.gallery.utils.download_helper import ensure_cached_download_for_photo
from app.storage import storage
from app.gallery.utils.image_pipline import process_image_pipeline
from app.gallery.utils.urls import url_from_path
from app.gallery.utils.zip_gcs import signed_zip_url, ensure_zip_in_gcs, zip_key


router = APIRouter(tags=["Gallery"])

@router.post("/galleries", status_code=201)
def create_gallery(payload: GalleryCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    g = crud.create_gallery(db, owner_id=user.id, title=payload.title, description=payload.description, is_public=payload.is_public) # type: ignore
    return g


@router.get("/galleries")
def list_galleries(db: Session = Depends(get_db), user=Depends(get_current_user)):
    out = crud.get_galleries_for_owner_with_cover(db, user.id)
    return {"galleries": out}


def save_upload_fileobj(upload_file: UploadFile, dest: Path):
    """
    Save the UploadFile stream to the absolute filesystem Path `dest`.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)


@router.get("/galleries/{gallery_id}", status_code=200)
async def get_gallery(
    gallery_id: str,
    db: Session = Depends(get_db)):
    return crud.get_gallery(db, gallery_id)


@router.post("/galleries/{gallery_id}/photos", status_code=201)
async def upload_photos(
    background_tasks: BackgroundTasks,
    gallery_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # Validate gallery exists and belongs to user (recommended)
    # gallery = crud.get_gallery(db, gallery_id)
    # if not gallery or gallery.owner_id != user.id:
    #     raise HTTPException(status_code=404, detail="Gallery not found")

    created = []
    owner_id_str = str(user.id)
    gallery_id_str = str(gallery_id)

    for upload in files:
        # normalize extension
        upload.filename = upload.filename.lower()
        ext = os.path.splitext(upload.filename)[1].lower()
        
        if not ext:
            ext = ".jpg"
        elif not ext.startswith("."):
            ext = f".{ext}"

        # generate file_id (string UUID) for filesystem usage and DB reference
        file_id = str(uuid.uuid4())

        key_original = f"{gallery_id_str}/original/{upload.filename}"

        await upload.seek(0)
        storage.save_fileobj(upload.file, key_original)
        
        stored_path = f"gs://{config.GCS_BUCKET_NAME}/{key_original}"
        # absolute filesystem path where we'll save the uploaded original

        # create DB record and include file_id + relative path
        p = crud.create_photo(
            db,
            gallery_id=gallery_id_str,
            filename=upload.filename,
            ext=ext,
            path_original=stored_path,  # store relative web path in DB
            file_id=file_id,
        )

        # schedule background processing using absolute path for processing and file_id for lookup
        background_tasks.add_task(process_image_pipeline, p.filename, stored_path, owner_id_str, gallery_id_str)

        created.append({
            "id": p.id,
            "file_id": p.file_id,
            "filename": p.filename,
            "path_original": p.path_original,
        })

    return {"photos": created}


@router.post("/galleries/{gallery_id}/password", status_code=200)
def set_gallery_password_endpoint(gallery_id: str, payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """
    Owner-only endpoint to set or remove a password for a gallery.
    payload: { "password": "..." }  or { "password": null } to remove
    """
    password = payload.get("password") if isinstance(payload, dict) else None
    try:
        gallery = crud.set_gallery_password(db, gallery_id=str(gallery_id), owner_id=str(user.id), password=password)
        return {"ok": True, "gallery_id": str(gallery.id), "protected": bool(gallery.password_hash)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    

@router.post("/galleries/{gallery_id}/unlock", status_code=200)
def unlock_gallery_endpoint(gallery_id: str, body: dict, response: Response, db: Session = Depends(get_db)):
    """
    Client submits { "password": "..." }. If correct, server sets a short-lived cookie to allow access.
    Returns {"ok": True} on success.
    Cookie name: gallery_access_{gallery_id}
    """
    password = body.get("password") if isinstance(body, dict) else None
    if password is None:
        raise HTTPException(status_code=400, detail="Password required")

    ok = crud.verify_gallery_password(db, gallery_id=str(gallery_id), password=password)
    if not ok:
        raise HTTPException(status_code=403, detail="Invalid password")

    # create signed short-lived token and set cookie
    token = create_gallery_access_token(str(gallery_id))
    cookie_name = f"gallery_access_{gallery_id}"
    response.set_cookie(cookie_name, token, httponly=True, max_age=60*60, samesite="lax", path="/")
    return {"ok": True}

@router.get("/galleries/{gallery_id}/photos")
def list_photos(gallery_id: str,request: Request, db: Session = Depends(get_db), user=Depends(get_optional_current_user)):
    gallery = crud.get_gallery(db, gallery_id)
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    allowed = False
    if user:
        allowed = True
    else:
        token = request.cookies.get(f"gallery_access_{gallery_id}")
        if token and verify_gallery_access_token(token, gallery_id):
            allowed = True
    
    if not allowed:
        raise HTTPException(status_code=401, detail="Unauthorized - gallery is password protected")
    
    photos = crud.list_photos(db, gallery_id)
    out = []
    for p in photos:
        out.append({
            "id": str(p.id),
            "file_id": getattr(p, "file_id", None),
            "filename": p.filename,
            "path_original": url_from_path(p.path_original),
            "path_preview": url_from_path(p.path_preview),
            "path_thumb": url_from_path(p.path_thumb),
            "width": p.width,
            "height": p.height,
            "order_index": p.order_index,
            "is_cover": p.is_cover,
        })
    return {"photos": out}


# -------------------------
# Helpers
# -------------------------

def _key_from_stored_path(path: str) -> str:
    """
    Convert stored DB path ('/media/<key>' or 'gs://bucket/<key>' or raw key) to a storage key.
    """
    if not path:
        return ""
    if path.startswith("gs://"):
        return path.split("/", 3)[-1]  # after 'gs://bucket/'
    return path.lstrip("/")

@router.delete("/galleries/{gallery_id}/photos/{photo_id}", status_code=204)
def delete_photo(
    gallery_id: str,
    photo_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    photo = db.query(Photo).filter(
        Photo.id == photo_id, Photo.gallery_id == gallery_id
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Optional: delete files from storage
    for path in [photo.path_original, photo.path_preview, photo.path_thumb]:
        if not path:
            continue
        key = _key_from_stored_path(path)
        try:
            storage.delete(key)
        except Exception:
            pass

    db.delete(photo)
    db.commit()
    return {"detail": "Photo deleted"}


@router.post("/galleries/{gallery_id}/photos/{photo_id}/cover", status_code=200)
def set_photo_as_cover(
    gallery_id: str,
    photo_id: str,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    """
    Set a photo as the gallery cover. This will:
    - validate gallery/photo ownership
    - unset any other photo.is_cover in the gallery
    - set this photo.is_cover = True
    - optionally update gallery.cover_photo_id (if you added that column)
    """
    # validate gallery exists and belongs to user
    gallery = db.query(Gallery).filter(Gallery.id == gallery_id).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    if gallery.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    # find the photo
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.gallery_id == gallery_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # unset any existing cover(s) in this gallery
    db.query(Photo).filter(Photo.gallery_id == gallery_id, Photo.is_cover == True).update({ "is_cover": False })
    db.commit()

    # set this one
    photo.is_cover = True
    db.add(photo)
    # if you want to store cover_photo_id on gallery, update it here:
    # gallery.cover_photo_id = photo.id
    # db.add(gallery)
    db.commit()

    return {"detail": "Cover set", "photo_id": photo.id}


@router.post("/galleries/{gallery_id}/unlock")
def unlock_gallery(gallery_id: str, payload: dict, response: Response, db: Session = Depends(get_db)):
    password = payload.get("password")
    if password is None:
        raise HTTPException(status_code=400, detail="Password required")
    if not crud.verify_gallery_password(db, gallery_id, password):
        raise HTTPException(status_code=401, detail="Invalid password")
    token = create_gallery_access_token(gallery_id=gallery_id)
    max_age = 60 * 60 * 24
    response.set_cookie(
        key=f"gallery_access_{gallery_id}",
        value = token,
        httponly=True,
        max_age = max_age,
        path="/",
        samesite="lax"
    )
    return {"ok": True}

@router.get("/galleries/{gallery_id}/download")
def download_gallery_route(
    gallery_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    size: str = Query("original", regex="^(original|large|medium|web)$"),
    linkOnly: bool = Query(False),
    db: Session = Depends(get_db),
    current_user = Depends(get_optional_current_user),
):
    # permission
    check_gallery_access(db, gallery_id, request, current_user)
    filename = f"gallery-{gallery_id}-{size}.zip"
    print("Ziiping")
    key = ensure_zip_in_gcs(db, gallery_id, size)
    if linkOnly:
        url = storage.signed_url(key, expires_seconds=600, response_disposition=None)
        return {"url": url, "filename": filename}
    reader = storage.open_reader(key)  # file-like object
    return StreamingResponse(
        reader,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )

from urllib.parse import quote

@router.get("/galleries/{gallery_id}/photos/{photo_id}")
def download_single_photo(
    gallery_id: str,
    photo_id: str,
    request: Request,
    size: str = Query("original", pattern="^(original|large|medium|web)$"),
    db: Session = Depends(get_db),
    current_user = Depends(get_optional_current_user),
):
    # Permission
    check_gallery_access(db, gallery_id, request, current_user)

    photo = crud.get_photo(db, gallery_id, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Ensure artifact exists; returns ("local", path) or ("gcs", key)
    try:
        backend, ref = ensure_cached_download_for_photo(db, photo, size)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Source not available")
    # print(ref)
    safe_name = os.path.splitext(photo.filename or f"photo-{photo_id}")[0]
    download_name = f"{safe_name}_{size}.jpg"
    if backend == "local":
        return FileResponse(ref, media_type="image/jpeg", filename=download_name)
    content_disposition = f'attachment; filename="{download_name}"'
    # GCS: generate signed URL and redirect
    # add content-disposition so browser saves with expected name
    url = url_from_path(f"gs://{config.GCS_BUCKET_NAME}/{ref}", config.GCS_SIGNED_URL_EXP_SECONDS, response_disposition=content_disposition)
    filename = f"{os.path.splitext(photo.filename or f'photo-{photo_id}')[0]}_{size}.jpg"
    # print(url)
    return {"url": url, "filename": filename}

