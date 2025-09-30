# backend/app/config.py
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", BASE_DIR / "media"))
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

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