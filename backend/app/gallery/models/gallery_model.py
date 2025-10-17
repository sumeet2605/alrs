from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, Text, DateTime #type: ignore
from sqlalchemy.sql import func #type: ignore
from sqlalchemy import ForeignKey #type: ignore
from sqlalchemy.orm import relationship #type: ignore
from app.database import Base #type: ignore
import uuid

def gen_uuid_str():
    return str(uuid.uuid4())

class Gallery(Base):
    __tablename__ = "galleries"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())
    password_hash = Column(String(256), nullable=True)
    password_expires_at = Column(DateTime(timezone=True), nullable=True)
    download_count = Column(Integer, nullable=True)
    download_limit = Column(Integer, default=5)
    resets_at = Column(DateTime(timezone=True), nullable=True)
    favorites_limit = Column(Integer, nullable=True)

    owner = relationship("User", back_populates="galleries")
    photos = relationship("Photo", back_populates="gallery", cascade="all, delete-orphan", order_by="Photo.order_index")


class Photo(Base):
    __tablename__ = "photos"
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String(36), unique=True, nullable=True, default=gen_uuid_str)  # NEW column
    gallery_id = Column(Integer, ForeignKey("galleries.id", ondelete="CASCADE"), index=True, nullable=False)
    filename = Column(String(512), nullable=False)
    ext = Column(String(10), nullable=False)
    path_original = Column(String(1024), nullable=False)
    path_preview = Column(String(1024), nullable=True)
    path_thumb = Column(String(1024), nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    uploaded_at = Column(TIMESTAMP, server_default=func.now())
    order_index = Column(Integer, default=0)
    is_cover = Column(Boolean, default=False)

    gallery = relationship("Gallery", back_populates="photos")


class Branding(Base):
    __tablename__ = "branding"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    logo_path = Column(String(1024), nullable=True)
    watermark_path = Column(String(1024), nullable=True)
    watermark_opacity = Column(Integer, default=40)  # store as percent (0-100)
    watermark_scale = Column(Integer, default=20)    # percent