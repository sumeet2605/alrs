from __future__ import annotations
from typing import BinaryIO, Optional, List
from pathlib import Path
from abc import ABC

class Storage:
    """
    Common interface for interchangeable storage backends.
    Keys must be POSIX-style paths:
        galleries/{gallery_id}/originals/{file}.jpg
    """

    # ---------- Core ----------

    def save_fileobj(self, fileobj: BinaryIO, key: str, content_type: Optional[str] = None) -> str:
        raise NotImplementedError

    def delete(self, key: str) -> None:
        raise NotImplementedError

    def exists(self, key: str) -> bool:
        raise NotImplementedError

    def list_files(self, prefix: str) -> List[str]:
        raise NotImplementedError

    def open_reader(self, key: str) -> BinaryIO:
        raise NotImplementedError

    # ---------- URL helpers ----------

    def url_for(self, key: str) -> Optional[str]:
        """
        Return a direct URL if publicly accessible.
        """
        return None

    def signed_url(self, key: str, expires_seconds: int = 3600) -> str:
        raise NotImplementedError

    # ---------- Helpers ----------

    def write_bytes(self, key: str, data: bytes) -> str:
        import io
        buf = io.BytesIO(data)
        buf.seek(0)
        return self.save_fileobj(buf, key)
