from fastapi import APIRouter, Header, HTTPException
from app.services.cleanup_expired_galleries import cleanup_expired_galleries
import os

router = APIRouter()

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")

@router.post("/admin/cleanup")
def run_cleanup(x_api_key: str = Header(None)):
    if not ADMIN_API_KEY or x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")

    result = cleanup_expired_galleries()
    return result
