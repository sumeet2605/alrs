# app/gallery/controllers/favorite_controller.py
from fastapi import APIRouter, Depends, HTTPException, Request, status #type: ignore
from sqlalchemy.orm import Session #type: ignore
from app.database import get_db
from app.gallery.services import gallery_service as gcrud
from app.gallery.services import favorite_service as fsvc
from app.gallery.utils.selector import get_selector_for_request
from app.auth.services.dependencies import get_current_user, get_optional_current_user

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
    gallery = gcrud.get_gallery(db, gallery_id)
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
    gallery = gcrud.get_gallery(db, gallery_id)
    if not gallery:
        raise HTTPException(404, "Gallery not found")
    if gallery.owner_id != current_user.id:
        raise HTTPException(403, "Not allowed")
    limit = payload.get("limit", None)  # null to reset to default
    gallery = fsvc.set_gallery_favorites_limit(db, gallery, limit)
    return {"favorites_limit": gallery.favorites_limit}
