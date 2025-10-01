from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, UniqueConstraint, func #type: ignore
from sqlalchemy.orm import relationship #type:ignore
from app.database import Base


class Favorite(Base):
    __tablename__ = "favorites"
    id = Column(Integer, primary_key=True, index=True)
    gallery_id = Column(Integer, ForeignKey("galleries.id", ondelete="CASCADE"), index=True, nullable=False)
    photo_id = Column(Integer, ForeignKey("photos.id", ondelete="CASCADE"), index=True, nullable=False)
    selector = Column(String(128), index=True, nullable=False)
    created_at =Column(TIMESTAMP, server_default=func.now())

    __table_args__ =(
        UniqueConstraint("gallery_id", "photo_id", "selector", name="uq_favorite_unique"),
    )