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

@router.post("/galleries/{gallery_id}/photos", status_code=201)
async def upload_photos(
    background_tasks: BackgroundTasks,
    gallery_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    created = []
    owner_id_str = str(user.id)
    gallery_id_str = str(gallery_id)

    for upload in files:
        upload.filename = upload.filename.lower()
        ext = os.path.splitext(upload.filename)[1].lower()
        if not ext:
            ext = ".jpg"
        elif not ext.startswith("."):
            ext = f".{ext}"

        file_id = str(uuid.uuid4())
        key_original = f"{gallery_id_str}/original/{upload.filename}"

        await upload.seek(0)
        storage.save_fileobj(upload.file, key_original)

        # Store ONLY key (provider-agnostic)
        stored_path = key_original

        p = crud.create_photo(
            db,
            gallery_id=gallery_id_str,
            filename=upload.filename,
            ext=ext,
            path_original=stored_path,
            file_id=file_id,
        )

        background_tasks.add_task(process_image_pipeline, p.filename, stored_path, owner_id_str, gallery_id_str)

        created.append({
            "id": p.id,
            "file_id": p.file_id,
            "filename": p.filename,
            "path_original": p.path_original,
        })

    return {"photos": created}

@router.post("/galleries/{gallery_id}/unlock")
def unlock_gallery(gallery_id: str, payload: dict, response: Response, db: Session = Depends(get_db)):
    password = payload.get("password")
    if password is None:
        raise HTTPException(status_code=400, detail="Password required")
    if not crud.verify_gallery_password(db, gallery_id, password):
        raise HTTPException(status_code=401, detail="Invalid password")
    token = create_gallery_access_token(gallery_id=gallery_id)
    max_age = 60 * 60  # 1 hour
    response.set_cookie(
        key=f"gallery_access_{gallery_id}",
        value=token,
        httponly=True,
        secure=True,
        max_age=max_age,
        path="/",
        samesite="lax"
    )
    return {"ok": True}
