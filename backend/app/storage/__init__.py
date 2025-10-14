from __future__ import annotations
from app import config
from .base import Storage
from .gcs import GCSStorage
from .local import LocalStorage
from app.settings import settings


def get_storage() -> Storage:
    """Factory to instantiate storage backend based on environment settings."""
    if settings.STORAGE_BACKEND.lower() == "gcs":
        return GCSStorage()
    else:
        return LocalStorage()

storage: Storage = get_storage()