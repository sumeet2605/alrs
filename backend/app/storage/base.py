from __future__ import annotations
from typing import BinaryIO, Optional, Iterator, Any
from pathlib import Path
from abc import ABC, abstractmethod

class Storage:
    """
    Common interface for Local and GCS storage backends.
    Keys should be POSIX-like paths (e.g. '1/42/originals/uuid.jpg').
    """
    @abstractmethod
    def _bucket(self) -> Any:
        """
        Return a storage-provider-specific blob object for key.
        Concrete implementations (GCSStorage) must implement this.
        """
        raise NotImplementedError
    
    @abstractmethod
    def _blob(self, key: str) -> Any:
        """
        Return a storage-provider-specific blob object for key.
        Concrete implementations (GCSStorage) must implement this.
        """
        raise NotImplementedError

    def save_fileobj(self, fileobj: BinaryIO, key: str, content_type: Optional[str] = None) -> str:
        """Save stream to storage at key. Returns canonical stored key."""
        raise NotImplementedError

    def download_to_path(self, key: str, dst_path: str) -> None:
        """Download object identified by key to local filesystem path."""
        raise NotImplementedError

    def exists(self, key: str) -> bool:
        """Check if object exists."""
        raise NotImplementedError


    def delete(self, key: str) -> None:
        """Delete object (best-effort)."""
        raise NotImplementedError

    def url_for(self, key: str) -> Optional[str]:
        """
        Return a direct (public) URL if available (may be None for private buckets).
        """
        return None

    def signed_url(self, key: str, expires_seconds: int, response_disposition) -> str:
        """Return a temporary signed URL to the object."""
        raise NotImplementedError

    def backend_name(self) -> str:
        return "base"
    
    def read_bytes(self, key: str) -> bytes:
        """Optional fast-path; default implementation reads via tmp path."""
        import tempfile, os
        tmp = tempfile.NamedTemporaryFile(delete=False)
        try:
            self.download_to_path(key, tmp.name)
            with open(tmp.name, "rb") as f:
                return f.read()
        finally:
            try: os.remove(tmp.name)
            except Exception: pass

    def open_reader(self, key: str) -> BinaryIO:
        """Optional streaming reader; default reads bytes into memory."""
        import io
        return io.BytesIO(self.read_bytes(key))
    
    def write_bytes(self, key: str, data: bytes) -> str:
        """Optional fast-path; default uses save_fileobj on a BytesIO."""
        import io
        buf = io.BytesIO(data)
        buf.seek(0)
        return self.save_fileobj(buf, key)
    
    def generate_signed_upload_url(
        self,
        key: str,
        expires: int = 15 * 60,
        *,
        content_type: Optional[str] = "application/octet-stream",
    ) -> str:
        """
        Generate a V4 signed URL suitable for uploading a file with PUT.
        Returns a URL that accepts a PUT with `Content-Type` = content_type.
        """
        raise NotImplementedError