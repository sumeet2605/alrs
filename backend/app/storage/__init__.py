from __future__ import annotations
from app import config
<<<<<<< HEAD
from .base import Storage


def _get_storage() -> Storage:
    backend = getattr(config, "STORAGE_BACKEND", "gcs").lower()

    if backend == "local":
        from .local import LocalStorage
        return LocalStorage()

    elif backend == "spaces":
        from .spaces import SpacesStorage
        return SpacesStorage()

=======

def _get_storage():
    backend = config.STORAGE_BACKEND.lower()

    if backend == "local":
        from .local import LocalStorage
        return LocalStorage()

    elif backend == "spaces":
        from .spaces import SpacesStorage
        return SpacesStorage()

>>>>>>> 3d82974 (updated models)
    elif backend == "gcs":
        from .gcs import GCSStorage
        return GCSStorage()

    else:
<<<<<<< HEAD
        raise RuntimeError(f"Invalid or unsupported STORAGE_BACKEND: {backend}")


storage: Storage = _get_storage()
=======
        raise ValueError(f"Unsupported STORAGE_BACKEND: {backend}")

storage = _get_storage()
>>>>>>> 3d82974 (updated models)
