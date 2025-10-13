# backend/app/config.py
from pathlib import Path
import os
import google.cloud.storage
import os #
origins = os.getenv("ORIGINS", "")

origins_list = origins = [origin.strip() for origin in origins.split(",") if origin.strip()]

if not origins:
    FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
else:

    FRONTEND_ORIGINS = origins_list

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "gcs")

print(f"DEBUG: Installed google-cloud-storage version: {google.cloud.storage.__version__}")

# For GCS
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "")
GCS_SIGNED_URL_EXP_SECONDS = int(os.getenv("GCS_SIGNED_URL_EXP_SECONDS", "3600"))
GCS_CREDENTIALS_JSON = os.getenv("GCS_CREDENTIALS_JSON", "")  # path to service account json, or empty to use default creds
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")

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