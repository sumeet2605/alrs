from __future__ import annotations
from app import config
from .base import Storage
from .gcs import GCSStorage

storage: Storage = GCSStorage()
