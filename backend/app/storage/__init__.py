from __future__ import annotations
from app import config
from .base import Storage


def _get_storage() -> Storage:
    backend = getattr(config, "STORAGE_BACKEND", "gcs").lower()

    if backend == "local":
        from .local import LocalStorage
        return LocalStorage()

    elif backend == "spaces":
        from .spaces import SpacesStorage
        return SpacesStorage()

    elif backend == "gcs":
        from .gcs import GCSStorage
        return GCSStorage()

    else:
        raise RuntimeError(f"Invalid or unsupported STORAGE_BACKEND: {backend}")


storage: Storage = _get_storage()
