# backend/app/auth/utils/tokens.py
from datetime import datetime, timedelta
from jose import jwt
from app import config
from os import getenv

GALLERY_TOKEN_ALG = "HS256"
GALLERY_TOKEN_EXP_MIN = 60  # minutes
SECRET_KEY = getenv("SECRET_KEY")

def create_gallery_access_token(gallery_id: str, expires_minutes: int = GALLERY_TOKEN_EXP_MIN) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": f"gallery:{gallery_id}",
        "gallery_id": str(gallery_id),
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=GALLERY_TOKEN_ALG)
    return token

def verify_gallery_access_token(token: str, gallery_id: str) -> bool:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[GALLERY_TOKEN_ALG])
        if payload.get("gallery_id") != str(gallery_id):
            return False
        return True
    except Exception:
        return False
