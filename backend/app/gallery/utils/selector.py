# app/gallery/utils/selector.py
import hashlib
from fastapi import Request #type: ignore
from app.auth.models.user_model import User

def get_selector_for_request(request: Request, gallery_id: int, user: User | None) -> str:
    if user:
        return f"user:{user.id}"
    # fall back to the gallery access cookie token; hash to keep it short/stable
    cookie_name = f"gallery_access_{gallery_id}"
    token = request.cookies.get(cookie_name, "")
    h = hashlib.sha1(token.encode("utf-8")).hexdigest() if token else "anon"
    return f"cookie:{h}"
