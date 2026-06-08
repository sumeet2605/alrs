import boto3
from botocore.exceptions import ClientError
from .base import Storage
from app import config


class SpacesStorage(Storage):
    def __init__(self):
        self.bucket_name = config.SPACES_BUCKET
        self.client = boto3.client(
            "s3",
            region_name=config.SPACES_REGION,
            endpoint_url=config.SPACES_ENDPOINT,
            aws_access_key_id=config.SPACES_KEY,
            aws_secret_access_key=config.SPACES_SECRET,
        )

    def save_fileobj(self, fileobj, key, content_type=None):
        self.client.upload_fileobj(
            fileobj,
            self.bucket_name,
            key,
            ExtraArgs={"ContentType": content_type} if content_type else None,
        )
        return key

    def delete(self, key: str) -> None:
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
        except ClientError:
            pass

    def exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False

    def download_to_path(self, key: str, dst_path: str) -> None:
        self.client.download_file(self.bucket_name, key, dst_path)

    def signed_url(self, key: str, expires_seconds: int, response_disposition=None) -> str:
        params = {"Bucket": self.bucket_name, "Key": key}
        if response_disposition:
            params["ResponseContentDisposition"] = response_disposition
        return self.client.generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=expires_seconds,
        )

    def backend_name(self) -> str:
        return "spaces"
