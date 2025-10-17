# app/gallery/controllers/favorite_controller.py
from fastapi import APIRouter, Depends, HTTPException, Request, status #type: ignore
from fastapi.responses import StreamingResponse  #type: ignore
import io
import csv
from sqlalchemy import text  #type: ignore
from sqlalchemy.orm import Session #type: ignore
from app.database import get_db
from app.gallery.services import gallery_service as gcrud
from app.gallery.services import favorite_service as fsvc
from app.gallery.utils.selector import get_selector_for_request
from app.auth.services.dependencies import get_current_user, get_optional_current_user
from app.gallery.models.gallery_model import Photo

router = APIRouter(prefix="/api/galleries", tags=["Favorites"])

@router.get("/{gallery_id}/favorites")
def get_favorites(
    gallery_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_optional_current_user),
):
    gallery = gcrud.get_gallery(db, str(gallery_id))
    if not gallery:
        raise HTTPException(404, "Gallery not found")
    selector = get_selector_for_request(request, gallery_id, current_user)
    favs = fsvc.list_favorites(db, gallery_id, selector)
    return {"photo_ids": [f.photo_id for f in favs], "limit": fsvc.get_effective_limit(gallery)}

@router.post("/{gallery_id}/favorites/{photo_id}", status_code=201)
def add_favorite(
    gallery_id: int,
    photo_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_optional_current_user),
):
    gallery = gcrud.get_gallery(db, str(gallery_id))
    if not gallery:
        raise HTTPException(404, "Gallery not found")
    selector = get_selector_for_request(request, gallery_id, current_user)
    fav, err = fsvc.add_favorite(db, gallery, photo_id, selector)
    if err:
        if err == "Favorites limit reached":
            raise HTTPException(status_code=409, detail=err)
        raise HTTPException(status_code=400, detail=err)
    return {"ok": True, "photo_id": fav.photo_id}

@router.delete("/{gallery_id}/favorites/{photo_id}")
def remove_favorite(
    gallery_id: int,
    photo_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_optional_current_user),
):
    selector = get_selector_for_request(request, gallery_id, current_user)
    ok = fsvc.remove_favorite(db, gallery_id, photo_id, selector)
    if not ok:
        raise HTTPException(404, "Favorite not found")
    return {"ok": True}

# Owner-only: set limit
@router.put("/{gallery_id}/favorites/limit")
def set_favorites_limit(
    gallery_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),  # must be owner
):
    gallery = gcrud.get_gallery(db, str(gallery_id))
    if not gallery:
        raise HTTPException(404, "Gallery not found")
    if not current_user.id:
        raise HTTPException(403, "Not allowed")
    limit = payload.get("limit", None)  # null to reset to default
    gallery = fsvc.set_gallery_favorites_limit(db, gallery, limit)
    return {"favorites_limit": gallery.favorites_limit}

@router.get("/{gallery_id}/favorites/limit")
def get_favorites_limit(
    gallery_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),  # must be owner
):
    gallery = gcrud.get_gallery(db, str(gallery_id))
    if not gallery:
        raise HTTPException(404, "Gallery not found")
    if not current_user.id:
        raise HTTPException(403, "Not allowed")
    return {"limit": gallery.favorites_limit}


@router.get("/galleries/{gallery_id}/favorites/export", response_class=StreamingResponse)
def export_favorites_csv(
    gallery_id: str,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    """
    Export favorites for a gallery as CSV (owner-only).
    CSV columns: photo_id, filename, order_index, is_cover, added_at (if available)
    """

    # ensure gallery exists and is owned by user
    gallery = gcrud.get_gallery(db, gallery_id)
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    if str(gallery.owner_id) != str(getattr(user, "id", None)):
        raise HTTPException(status_code=403, detail="Only the gallery owner may export favorites")

    # attempt to load favorites from a favorites table (if present)
    # This raw query is defensive: if the favorites table doesn't exist, we'll fallback to an empty list.
    fav_photo_ids = []
    try:
        q = text("SELECT photo_id, created_at FROM favorites WHERE gallery_id = :gid ORDER BY created_at ASC")
        res = db.execute(q, {"gid": gallery_id})
        rows = res.fetchall()
        fav_photo_ids = [(str(r[0]), getattr(r, "created_at", None) or (r[1] if len(r) > 1 else None)) for r in rows]
    except Exception:
        # favorites table might not exist or some other issue — fallback to empty
        fav_photo_ids = []

    # if favorites table didn't exist or is empty, return empty CSV header
    # Otherwise join against photos table for metadata
    photo_map = {}
    if fav_photo_ids:
        # fetch photo metadata for these IDs
        ids = [fp[0] for fp in fav_photo_ids]
        photos = db.query(Photo).filter(Photo.gallery_id == gallery_id, Photo.id.in_(ids)).all()
        photo_map = {str(p.id): p for p in photos}

    # streaming CSV generator
    def csv_generator():
        buf = io.StringIO()
        writer = csv.writer(buf)
        # header
        writer.writerow(["photo_id", "filename", "order_index"])
        yield buf.getvalue()
        buf.seek(0)
        buf.truncate(0)

        for pid, added_at in fav_photo_ids:
            p = photo_map.get(pid)
            filename = getattr(p, "filename", "") if p else ""
            order_index = getattr(p, "order_index", "")
            writer.writerow([pid, filename, order_index])
            yield buf.getvalue()
            buf.seek(0)
            buf.truncate(0)

    headers = {
        "Content-Disposition": f'attachment; filename="gallery-{gallery_id}-favorites.csv"'
    }
    return StreamingResponse(csv_generator(), media_type="text/csv", headers=headers)