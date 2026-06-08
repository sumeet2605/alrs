from __future__ import annotations
from app import config
from .base import Storage
from .gcs import GCSStorage

# Optional imports to avoid hard dependency when not used
try:
    from .local import LocalStorage
except Exception:
    LocalStorage = None

try:
    from .spaces import SpacesStorage
except Exception:
    SpacesStorage = None

backend = getattr(config, "STORAGE_BACKEND", "gcs").lower()

if backend == "gcs":
    storage: Storage = GCSStorage()
elif backend == "local" and LocalStorage is not None:
    storage = LocalStorage()
elif backend == "spaces" and SpacesStorage is not None:
    storage = SpacesStorage()
else:
    raise RuntimeError(f"Invalid or unsupported STORAGE_BACKEND: {backend}")
