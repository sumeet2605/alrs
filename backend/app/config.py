# backend/app/config.py
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", BASE_DIR / "media"))
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

# image sizes
IMAGE_SIZES = {
    "preview": 1600,
    "thumb": 400
}
