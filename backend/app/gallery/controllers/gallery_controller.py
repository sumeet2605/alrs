# backend/app/routes/galleries.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, Response, Request
from fastapi.responses import StreamingResponse
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db
import os
import uuid

from app.gallery.schemas.gallery_schema import GalleryCreate
from app.gallery.models.gallery_model import Gallery, Photo
from app.gallery.services import gallery_service as crud
from app.gallery.services.gallery_download_service import stream_gallery_zip
from app.auth.services.dependencies import get_current_user, get_optional_current_user
from app.gallery.utils.tokens import create_gallery_access_token, verify_gallery_access_token
from app.storage import storage

router = APIRouter(tags=["Gallery"])

# ========================
# Gallery CRUD
# ========================

@router.post("/galleries", status_code=201)
def create_gallery(payload: GalleryCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    g = crud.create_gallery(
        db,
        owner_id=user.id,
        title=payload.title,
        description=payload.description,
        is_public=payload.is_public,
    )
    return g


@router.get("/galleries")
def list_galleries(db: Session = Depends(get_db), user=Depends(get_current_user)):
    out = crud.get_galleries_for_owner_with_cover(db, user.id)
    return {"galleries": out}


# ========================
# Upload Logic (Storage Abstraction)
# ========================

@router.post("/galleries/{gallery_id}/photos", status_code=201)
async def upload_photos(
    gallery_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    created = []

    for upload in files:
        ext = os.path.splitext(upload.filename)[1].lower() or ".jpg"
        file_id = str(uuid.uuid4())

        key_original = f"galleries/{gallery_id}/originals/{file_id}{ext}"

        storage.save_fileobj(upload.file, key_original)

        p = crud.create_photo(
            db,
            gallery_id=gallery_id,
            filename=upload.filename,
            ext=ext,
            path_original=key_original,
            file_id=file_id,
        )

        created.append(
            {
                "id": str(p.id),
                "file_id": p.file_id,
                "filename": p.filename,
                "url_original": storage.url_for(key_original),
            }
        )

    return {"photos": created}


# ========================
# Password Protection
# ========================

@router.post("/galleries/{gallery_id}/password")
def set_gallery_password_endpoint(gallery_id: str, payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    password = payload.get("password") if isinstance(payload, dict) else None
    try:
        gallery = crud.set_gallery_password(
            db,
            gallery_id=str(gallery_id),
            owner_id=str(user.id),
            password=password,
        )
        return {"ok": True, "gallery_id": str(gallery.id), "protected": bool(gallery.password_hash)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/galleries/{gallery_id}/unlock")
def unlock_gallery(gallery_id: str, body: dict, response: Response, db: Session = Depends(get_db)):
    password = body.get("password") if isinstance(body, dict) else None
    if password is None:
        raise HTTPException(status_code=400, detail="Password required")

    ok = crud.verify_gallery_password(db, gallery_id=str(gallery_id), password=password)
    if not ok:
        raise HTTPException(status_code=403, detail="Invalid password")

    token = create_gallery_access_token(str(gallery_id))
    cookie_name = f"gallery_access_{gallery_id}"
    response.set_cookie(cookie_name, token, httponly=True, max_age=60 * 60, samesite="lax", path="/")
    return {"ok": True}


# ========================
# Photo Listing
# ========================

@router.get("/galleries/{gallery_id}/photos")
def list_photos(gallery_id: str, request: Request, db: Session = Depends(get_db), user=Depends(get_optional_current_user)):
    gallery = crud.get_gallery(db, gallery_id)
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    allowed = False
    if user and gallery.owner_id == user.id:
        allowed = True
    elif gallery.is_public:
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
        out.append(
            {
                "id": str(p.id),
                "file_id": p.file_id,
                "filename": p.filename,
                "url_original": storage.url_for(p.path_original),
                "width": p.width,
                "height": p.height,
                "order_index": p.order_index,
                "is_cover": p.is_cover,
            }
        )
    return {"photos": out}


@router.delete("/galleries/{gallery_id}/photos/{photo_id}")
def delete_photo(
    gallery_id: str,
    photo_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.gallery_id == gallery_id
    ).first()

    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    gallery = db.query(Gallery).filter(Gallery.id == gallery_id).first()
    if not gallery or gallery.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    for key in [photo.path_original, photo.path_preview, photo.path_thumb]:
        if key:
            try:
                storage.delete(key)
            except Exception:
                pass

    db.delete(photo)
    db.commit()

    return {"detail": "Photo deleted"}


# ========================
# Download Gallery (Streaming)
# ========================

@router.get("/galleries/{gallery_id}/download")
def download_gallery_route(gallery_id: str, request: Request, db: Session = Depends(get_db), current_user=Depends(get_optional_current_user)):
    gallery = crud.get_gallery(db, gallery_id)
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    allowed = False
    if current_user and gallery.owner_id == current_user.id:
        allowed = True
    elif gallery.is_public:
        allowed = True
    else:
        token = request.cookies.get(f"gallery_access_{gallery_id}")
        if token and verify_gallery_access_token(token, gallery_id):
            allowed = True

    if not allowed:
        raise HTTPException(status_code=401, detail="Unauthorized")

    prefix = f"galleries/{gallery_id}/"
    zip_stream = stream_gallery_zip(prefix)

    return StreamingResponse(
        zip_stream,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="gallery_{gallery_id}.zip"'
        }
    )
