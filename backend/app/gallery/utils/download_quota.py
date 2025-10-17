from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from sqlalchemy.orm import Session #type: ignore
from fastapi import HTTPException, status #type: ignore
from app.gallery.services import gallery_service as crud  # reuse service that returns gallery model
from sqlalchemy import select, update #type: ignore

# Simple quota semantics:
# - If gallery.download_limit is None -> unlimited
# - If download_reset_at is set and now > reset -> reset counter to 0 and clear/reset reset_at
# - We increment download_count by `reserve` atomically (via DB commit)


def _now_utc():
    return datetime.now(timezone.utc)


def _is_actor_owner_or_internal(actor: Optional[Any], gallery) -> bool:
    """
    Decide whether the actor should be treated as internal (not counted).
    actor: optional user object (may be None for anonymous)
    gallery: gallery model instance
    Returns True if actor is the owner (or clearly internal), False otherwise.
    """
    if not actor:
        return False
    # If actor has id and equals gallery.owner_id -> owner (do not count)
    try:
        if getattr(actor, "id", None) is not None and str(getattr(actor, "id")) == str(getattr(gallery, "owner_id", None)):
            return True
    except Exception:
        pass

    # If your user object has roles/flags for staff/admin, extend here:
    # e.g. if getattr(actor, "is_admin", False): return True
    # or if actor.role in ("admin","staff","photographer"): return True
    # We'll check common attribute names defensively:
    role = getattr(actor, "role", None)
    if role and str(role).lower() in ("admin", "staff", "photographer"):
        return True

    return False

def check_and_reserve_download(db: Session, gallery_id: str, reserve: int = 1, actor:Optional[Any] =None, window_seconds: Optional[int] = 24*3600):
    """
    Check gallery quota and increment download_count by `reserve` if allowed.
    Raises HTTPException(429) when quota exceeded.

    Returns the gallery object (fresh from DB) after increment.
    """
    # fetch gallery row (prefer service function)
    gallery = crud.get_gallery(db, gallery_id)
    if not gallery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery not found")
    
    if _is_actor_owner_or_internal(actor, gallery):
        return gallery
    limit = getattr(gallery, "download_limit", None)
    count = getattr(gallery, "download_count", 0) if getattr(gallery, "download_count", 0) is not None else 0
    reset_at = getattr(gallery, "resets_at", None)
    # print(count)
    # print(limit)
    # if reset time is set and in the past, reset the counter
    now = _now_utc()
    if reset_at is not None and isinstance(reset_at, datetime):
        if reset_at.tzinfo is None:
            # assume naive timestamps are UTC to avoid comparison issues
            reset_at = reset_at.replace(tzinfo=timezone.utc)
        if now >= reset_at:
            gallery.download_count = 0
            gallery.dresets_at = None
            db.add(gallery)
            db.commit()
            db.refresh(gallery)
            count = gallery.download_count
            reset_at = gallery.resets_at

    # unlimited
    if limit is None:
        # still optionally set a reset_at if not present (so we have a window)
        # but we will not enforce
        return gallery

    # check available
    if count + reserve > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Download limit reached ({count}/{limit}). Please contact the photographer."
        )

    # reserve/increment
    gallery.download_count = count + reserve
    # ensure there is a reset time on first reservation if not set
    if gallery.resets_at is None and window_seconds:
        gallery.resets_at = now + timedelta(seconds=window_seconds)
    db.add(gallery)
    db.commit()
    db.refresh(gallery)
    return gallery
