# app/rate_limiter.py
from slowapi import Limiter # type: ignore
from slowapi.util import get_remote_address # type: ignore
from os import getenv

# Optionally configure Redis storage via env var RATE_LIMIT_STORAGE_URI
STORAGE_URI = getenv("RATE_LIMIT_STORAGE_URI", None)

if STORAGE_URI:
    limiter = Limiter(key_func=get_remote_address, storage_uri=STORAGE_URI)
else:
    limiter = Limiter(key_func=get_remote_address)
