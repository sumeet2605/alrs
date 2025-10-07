from __future__ import annotations
from .base import Storage
from typing import BinaryIO, Optional
from pathlib import Path
from app import config
import io, os
from datetime import datetime, timedelta

# pip install google-cloud-storage
from google.cloud import storage as gcs #type: ignore
from google.oauth2 import service_account #type: ignore

project_id = config.GCP_PROJECT_ID

class GCSStorage(Storage):
    def __init__(self):
        self.bucket_name = config.GCS_BUCKET_NAME
        
        if not self.bucket_name:
            raise RuntimeError("GCS_BUCKET_NAME not set")

        if config.GCS_CREDENTIALS_JSON:
            creds = service_account.Credentials.from_service_account_file(config.GCS_CREDENTIALS_JSON)
            self.client = gcs.Client(credentials=creds, project=project_id)
        else:
            self.client = gcs.Client()  # default creds
        self.bucket = self.client.bucket(self.bucket_name)

    def _blob(self, key: str):
        # normalize key: remove leading slashes
        k = key.lstrip("/")
        return self.bucket.blob(k)

    def save_fileobj(self, fileobj: BinaryIO, key: str, content_type: Optional[str] = None) -> str:
        blob = self._blob(key)
        if content_type:
            blob.content_type = content_type
        blob.upload_from_file(fileobj, rewind=True)
        return key

    def download_to_path(self, key: str, dst_path: str) -> None:
        blob = self._blob(key)
        Path(dst_path).parent.mkdir(parents=True, exist_ok=True)
        blob.download_to_filename(dst_path)

    def exists(self, key: str) -> bool:
        return self._blob(key).exists()

    def delete(self, key: str) -> None:
        try:
            self._blob(key).delete()
        except Exception:
            pass

    def url_for(self, key: str) -> Optional[str]:
        # If your bucket is public, you can return blob.public_url
        # Most will be private; return None and use signed_url().
        return None
    
    def generate_signed_url(
        self,
        key: str,
        expires: int = 600,
        *,
        content_disposition: Optional[str] = None,
        content_type: Optional[str] = None,
        method: str = "GET",
    ) -> str:
        """
        Generate a V4 signed URL for the given object with optional headers.
        """
        blob = self._blob(key)
        params = {}
        if content_disposition:
            params["response-content-disposition"] = content_disposition
        if content_type:
            params["response-content-type"] = content_type

        # Use UTC for expiration
        expiration = datetime.utcnow() + timedelta(seconds=expires)
        return blob.generate_signed_url(
            expiration=expiration,
            method=method,
            response_disposition=content_disposition,
            response_type=content_type,
            # For older google-cloud-storage versions, use query_parameters=params
            # Newer versions accept response_* kwargs directly as above.
        )

    # Back-compat shim (if anything still calls this)
    

    def signed_url(self, key: str, expires_seconds: int, response_disposition) -> str:
        return self.generate_signed_url(key, expires=expires_seconds, content_disposition=response_disposition)

    def backend_name(self) -> str:
        return "gcs"

    def read_bytes(self, key: str) -> bytes:
        """
        Read the entire object into memory as bytes.
        """
        blob = self._blob(key)
        return blob.download_as_bytes()
    
    def open_reader(self, key: str):
        # Requires google-cloud-storage >= 2.10
        blob = self._blob(key)
        return blob.open("rb")