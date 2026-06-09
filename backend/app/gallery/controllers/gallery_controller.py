# backend/app/routes/galleries.py
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException, status, Response, Request  # type:ignore
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
from app.gallery.utils.download import download_gallery_disk

router = APIRouter(tags=["Gallery"])

@router.post("/galleries", status_code=201)
def create_gallery(payload: GalleryCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    g = crud.create_gallery(db, owner_id=user.id, title=payload.title, description=payload.description, is_public=payload.is_public)
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


def process_image_pipeline(photo_file_id: str, original_abs_path: str, owner_id: str, gallery_id: str):
    """
    Background worker:
    - original_abs_path: absolute filesystem path to the uploaded original file
    - photo_file_id: the Photo.file_id (UUID string) used to find DB record
    - after creating preview/thumb on disk, write relative /media/... paths to DB
    """
    # Create a fresh DB session here to avoid session scope issues with BackgroundTasks
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        owner_dir = config.MEDIA_ROOT / owner_id / gallery_id
        previews_dir = owner_dir / "previews"
        thumbs_dir = owner_dir / "thumbs"
        previews_dir.mkdir(parents=True, exist_ok=True)
        thumbs_dir.mkdir(parents=True, exist_ok=True)

        preview_abs_path = str(previews_dir / f"{photo_file_id}.jpg")
        thumb_abs_path = str(thumbs_dir / f"{photo_file_id}.jpg")

        # create preview/thumb on disk
        images.make_preview(original_abs_path, preview_abs_path, config.IMAGE_SIZES["preview"])
        images.make_thumb(original_abs_path, thumb_abs_path, config.IMAGE_SIZES["thumb"])

        # Build relative web paths to save in DB (what frontend will consume)
        rel_preview = f"/media/{owner_id}/{gallery_id}/previews/{photo_file_id}.jpg"
        rel_thumb = f"/media/{owner_id}/{gallery_id}/thumbs/{photo_file_id}.jpg"

        # update DB record found by file_id (file_id is a string UUID)
        p = db.query(Photo).filter(Photo.file_id == photo_file_id).first()
        if p:
            p.path_preview = rel_preview
            p.path_thumb = rel_thumb
            db.add(p)
            db.commit()
    finally:
        db.close()


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

    # Absolute dirs on disk
    owner_dir = Path(config.MEDIA_ROOT) / owner_id_str / gallery_id_str
    originals_dir = owner_dir / "originals"
    originals_dir.mkdir(parents=True, exist_ok=True)

    for upload in files:
        # normalize extension
        ext = os.path.splitext(upload.filename)[1].lower()
        if not ext:
            ext = ".jpg"
        elif not ext.startswith("."):
            ext = f".{ext}"

        # generate file_id (string UUID) for filesystem usage and DB reference
        file_id = str(uuid.uuid4())

        # absolute filesystem path where we'll save the uploaded original
        dest_original_path = originals_dir / f"{file_id}{ext}"
        dest_original_abs = str(dest_original_path)

        # save uploaded file to disk
        save_upload_fileobj(upload, dest_original_path)

        # relative web path to store in DB and return to frontend
        rel_path_original = f"/media/{owner_id_str}/{gallery_id_str}/originals/{file_id}{ext}"

        # create DB record and include file_id + relative path
        p = crud.create_photo(
            db,
            gallery_id=gallery_id_str,
            filename=upload.filename,
            ext=ext,
            path_original=rel_path_original,  # store relative web path in DB
            file_id=file_id,
        )

        # schedule background processing using absolute path for processing and file_id for lookup
        background_tasks.add_task(process_image_pipeline, p.file_id, dest_original_abs, owner_id_str, gallery_id_str)

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
        out.append({
            "id": str(p.id),
            "file_id": getattr(p, "file_id", None),
            "filename": p.filename,
            "path_original": p.path_original,
            "path_preview": p.path_preview,
            "path_thumb": p.path_thumb,
            "width": p.width,
            "height": p.height,
            "order_index": p.order_index,
            "is_cover": p.is_cover,
        })
    return {"photos": out}


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

    # Optional: also delete files from filesystem
    for path in [photo.path_original, photo.path_preview, photo.path_thumb]:
        if path and os.path.exists(path):
            try:
                os.remove(path)
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
    db: Session = Depends(get_db),
    current_user = Depends(get_optional_current_user),
):
    """
    Wrapper route that calls the download helper in app.gallery.download.
    """
    # gallery_download.download_gallery expects: (gallery_id, request, db, current_user)
    return download_gallery_disk(
        gallery_id=gallery_id,
        request=request,
        db=db,
        current_user=current_user
    )