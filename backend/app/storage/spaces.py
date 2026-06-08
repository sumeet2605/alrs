import boto3
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

    def generate_signed_url(self, key, expires=600):
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=expires,
        )
