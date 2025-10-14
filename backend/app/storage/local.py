# app/storage/local.py
from __future__ import annotations
from typing import BinaryIO, Optional
from pathlib import Path
import shutil
import mimetypes

from app.storage.base import Storage  # adjust import path if needed


class LocalStorage(Storage):
    def __init__(self, base_path: str):
        self.base = Path(base_path)
        self.base.mkdir(parents=True, exist_ok=True)

    def _fullpath(self, key: str) -> Path:
        # normalize key to avoid leading slashes, etc.
        clean = key.lstrip("/")
        return self.base / clean

    def save_fileobj(self, fileobj: BinaryIO, key: str, content_type: Optional[str] = None) -> str:
        dest = self._fullpath(key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        # write in chunks to support large streams
        with open(dest, "wb") as f:
            fileobj.seek(0)
            while True:
                chunk = fileobj.read(8192)
                if not chunk:
                    break
                f.write(chunk)
        return str(dest.relative_to(self.base))  # canonical stored key (posix path)

    def download_to_path(self, key: str, dst_path: str) -> None:
        src = self._fullpath(key)
        if not src.exists():
            raise FileNotFoundError(f"{key} does not exist in LocalStorage")
        dst = Path(dst_path)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)

    def exists(self, key: str) -> bool:
        return self._fullpath(key).exists()

    def delete(self, key: str) -> None:
        try:
            self._fullpath(key).unlink()
        except FileNotFoundError:
            pass

    def url_for(self, key: str) -> Optional[str]:
        """
        For development: return a file:// url OR a path relative to base;
        choose whatever your app expects. Here we return a file:// absolute path.
        """
        p = self._fullpath(key)
        if not p.exists():
            return None
        return p.resolve().as_uri()

    def signed_url(self, key: str, expires_seconds: int, response_disposition=None) -> str:
        """
        Not meaningful for local files — return file:// URL (no expiry).
        """
        url = self.url_for(key)
        if url is None:
            raise FileNotFoundError(key)
        return url

    def backend_name(self) -> str:
        return "local"
