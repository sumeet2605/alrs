from __future__ import annotations
from typing import Optional
from app.storage import storage
from app import config

def url_from_path(stored_path: Optional[str], expires: int = 0, response_disposition: Optional[str] = None) -> Optional[str]:
    if not stored_path:
        return None
    # Local: '/media/<key>'
    is_signed_request = response_disposition is not None or expires > 0
    if stored_path.startswith("/media/"):
        key = stored_path.lstrip("/").split("/", 1)[-1]
        # return absolute path via your existing reverse proxy; here return relative URL
        return f"/media/{key}"
    # GCS canonical: 'gs://bucket/key...'
    if stored_path.startswith("gs://"):
        # signed
        key = stored_path.split("/", 3)[-1]
        exp = expires or config.GCS_SIGNED_URL_EXP_SECONDS
        if is_signed_request:
            # Secure Download: generate a signed URL
            exp = expires or config.GCS_SIGNED_URL_EXP_SECONDS
            return storage.signed_url(key, exp, response_disposition)
        else:
            return storage.signed_url(key, exp, response_disposition)
    # raw key (fallback)
    if storage.backend_name() == "local":
        return f"/media/{stored_path.lstrip('/')}"
    else:
        exp = expires or config.GCS_SIGNED_URL_EXP_SECONDS
        return storage.signed_url(stored_path, exp, response_disposition)
