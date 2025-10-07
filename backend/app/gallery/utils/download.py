# backend/app/gallery/download_disk.py
from fastapi import Depends, HTTPException, status, Request, BackgroundTasks  # type: ignore
from sqlalchemy.orm import Session  # type: ignore
from pathlib import Path
from fastapi.responses import FileResponse  # type: ignore
import zipfile, tempfile, os
from typing import List, Tuple

from app.database import get_db
from app.gallery.services import gallery_service as crud
from app.gallery.utils.tokens import verify_gallery_access_token




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



