# backend/app/gallery/download_disk.py
from fastapi import Depends, HTTPException, status, Request, BackgroundTasks  # type: ignore
from sqlalchemy.orm import Session  # type: ignore
from pathlib import Path
from fastapi.responses import FileResponse  # type: ignore
import zipfile, tempfile, os
from typing import List, Tuple
from datetime import datetime, timezone

from app.database import get_db
from app.gallery.services import gallery_service as crud
from app.gallery.utils.tokens import verify_gallery_access_token




def check_gallery_access(db: Session, gallery_id: str, request: Request, current_user):
    gallery = crud.get_gallery(db, gallery_id)
    if not gallery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery not found")

    allowed = False
    # if password expired, disallow access unless owner (owner can always access)
    password_expires_at = getattr(gallery, "password_expires_at", None)
    if password_expires_at is not None:
        exp_dt = password_expires_at if getattr(password_expires_at, "tzinfo", None) is not None else password_expires_at.replace(tzinfo=timezone.utc)
        if exp_dt is not None and datetime.now(timezone.utc) > exp_dt:
            # owner may still access their own galleries (optional)
            if current_user:
                pass
            else:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Gallery password has expired")

    if current_user:
        allowed = True
    else:
        # Check for gallery access token in Authorization header (preferred)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            if token and verify_gallery_access_token(token, gallery_id):
                allowed = True
        
        # Fallback to cookie for legacy support
        if not allowed:
            cookie_name = f"gallery_access_{gallery_id}"
            token = request.cookies.get(cookie_name)
            if token and verify_gallery_access_token(token, gallery_id):
                allowed = True

    if not allowed:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    return gallery



