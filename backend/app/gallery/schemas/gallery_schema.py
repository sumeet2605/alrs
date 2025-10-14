# backend/app/schemas.py
from pydantic import BaseModel, Field #type: ignore
from typing import Optional, List, Union
from datetime import datetime

class SignedUrlRequest(BaseModel):
    filename: str
    content_type: str | None = "application/octet-stream"

class NotifyPayload(BaseModel):
    filename: str
    object_name: str
    gs_path: str
    size: int | None = None

class ResumableRequest(BaseModel):
    filename: str
    content_type: Optional[str] = "application/octet-stream"

class GalleryCreate(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: Optional[bool] = False



class PhotoOut(BaseModel):
    # allow either int or str for id
    id: Union[int, str]
    file_id: Optional[str] = None
    filename: str
    path_original: str
    path_preview: Optional[str] = None
    path_thumb: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    order_index: Optional[int] = None
    is_cover: Optional[bool] = False

    model_config = {
        "from_attributes": True,  # pydantic v2 ORM mode
    }

class GalleryOut(BaseModel):
    id: str
    owner_id: str
    title: str
    description: Optional[str]
    is_public: bool
    created_at: datetime
    cover_photo: Optional[PhotoOut] = None

    class Config:
        from_attributes = True