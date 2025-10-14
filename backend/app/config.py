# backend/app/config.py
from pathlib import Path
import os
import google.cloud.storage #type: ignore
import os #
from app.settings import settings

origins = os.getenv("ORIGINS", "")

origins_list = origins = [origin.strip() for origin in origins.split(",") if origin.strip()]


BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", BASE_DIR / "media"))
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)


if not origins:
    FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
else:

    FRONTEND_ORIGINS = origins_list

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")

print(f"DEBUG: Installed google-cloud-storage version: {google.cloud.storage.__version__}")

# For GCS
GCS_BUCKET_NAME = settings.GCS_BUCKET_NAME
GCS_SIGNED_URL_EXP_SECONDS = int(settings.GCS_SIGNED_URL_EXP_SECONDS)
GCS_CREDENTIALS_JSON = settings.GCS_CREDENTIALS_JSON  # path to service account json, or empty to use default creds
GCP_PROJECT_ID = settings.GCP_PROJECT_ID

# image sizes
IMAGE_SIZES = {
    "preview": 1280,
    "thumb": 320
}

# NEW: download sizes (longest edge)
DOWNLOAD_SIZES = {
    "original": None,   # special-cased
    "large": 2048,
    "medium": 1200,
    "web": 1024,
}

# Watermark application toggles (defaults—can be overridden by DB branding settings)
WM_APPLY_PREVIEWS = True
WM_APPLY_THUMBS = True
WM_APPLY_DOWNLOADS = True       # <- add watermark to download presets
WM_APPLY_ORIGINALS = True      # <- set True if you want originals watermarked too