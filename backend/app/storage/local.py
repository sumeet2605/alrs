from __future__ import annotations
from .base import Storage
from pathlib import Path
from typing import BinaryIO, Optional
import os
from app import config

class LocalStorage(Storage):
    def __init__(self):
        self.root: Path = config.MEDIA_ROOT

    def _abs(self, key: str) -> Path:
        return (self.root / key).resolve()

    def save_fileobj(self, fileobj: BinaryIO, key: str) -> str:
        p = self._abs(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "wb") as f:
            while True:
                chunk = fileobj.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)
        return key

    def download_to_path(self, key: str, dst_path: str) -> None:
        src = self._abs(key)
        Path(dst_path).parent.mkdir(parents=True, exist_ok=True)
        # local-to-local copy (hardlink or copy)
        import shutil
        shutil.copy2(src, dst_path)

    def exists(self, key: str) -> bool:
        return self._abs(key).exists()

    def delete(self, key: str) -> None:
        try:
            self._abs(key).unlink(missing_ok=True)  # py3.8+: emulate if needed
        except Exception:
            pass

    def url_for(self, key: str) -> Optional[str]:
        # Return relative URL your frontend resolves with OpenAPI.BASE
        return f"/media/{key}"

    def signed_url(self, key: str, expires_seconds: int) -> str:
        # For local, just return relative URL (no signature concept)
        return self.url_for(key)  # type: ignore

    def backend_name(self) -> str:
        return "local"
