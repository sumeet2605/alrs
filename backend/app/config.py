# backend/app/config.py
from pathlib import Path
import os

origins = os.getenv("ORIGINS", "")

origins_list = [origin.strip() for origin in origins.split(",") if origin.strip()]

if not origins:
    FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
else:
    FRONTEND_ORIGINS = origins_list

# Storage backend selector: gcs | local | spaces
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local").lower()

# --- GCS (optional, only used if STORAGE_BACKEND=gcs) ---
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "")
GCS_SIGNED_URL_EXP_SECONDS = int(os.getenv("GCS_SIGNED_URL_EXP_SECONDS", "3600"))
GCS_CREDENTIALS_JSON = os.getenv("GCS_CREDENTIALS_JSON", "")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")

# --- DigitalOcean Spaces (S3-compatible) ---
SPACES_BUCKET = os.getenv("SPACES_BUCKET", "")
SPACES_REGION = os.getenv("SPACES_REGION", "")
SPACES_ENDPOINT = os.getenv("SPACES_ENDPOINT", "")
SPACES_KEY = os.getenv("SPACES_KEY", "")
SPACES_SECRET = os.getenv("SPACES_SECRET", "")

# image sizes
IMAGE_SIZES = {
    "preview": 1280,
    "thumb": 320
}

# download sizes (longest edge)
DOWNLOAD_SIZES = {
    "original": None,
    "large": 2048,
    "medium": 1200,
    "web": 1024,
}

# Watermark application toggles
WM_APPLY_PREVIEWS = True
WM_APPLY_THUMBS = True
WM_APPLY_DOWNLOADS = True
WM_APPLY_ORIGINALS = True
