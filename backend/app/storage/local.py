from __future__ import annotations
from .base import Storage
from pathlib import Path
from typing import BinaryIO, Optional, List
import os
from app import config

class LocalStorage(Storage):
    def __init__(self):
        self.root: Path = config.MEDIA_ROOT

    def _abs(self, key: str) -> Path:
        return (self.root / key).resolve()

    # ---------- Core ----------

    def save_fileobj(self, fileobj: BinaryIO, key: str, content_type: Optional[str] = None) -> str:
        p = self._abs(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "wb") as f:
            while True:
                chunk = fileobj.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)
        return key

    def delete(self, key: str) -> None:
        try:
            self._abs(key).unlink(missing_ok=True)
        except Exception:
            pass

    def exists(self, key: str) -> bool:
        return self._abs(key).exists()

    def list_files(self, prefix: str) -> List[str]:
        base = self._abs(prefix)
        if not base.exists():
            return []
        results = []
        for root, _, files in os.walk(base):
            for name in files:
                full = Path(root) / name
                rel = full.relative_to(self.root)
                results.append(str(rel))
        return results

    def open_reader(self, key: str):
        return open(self._abs(key), "rb")

    # ---------- URL helpers ----------

    def url_for(self, key: str) -> Optional[str]:
        return f"/media/{key}"

    def signed_url(self, key: str, expires_seconds: int = 3600) -> str:
        return self.url_for(key)

    def backend_name(self) -> str:
        return "local"
