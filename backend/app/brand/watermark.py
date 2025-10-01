# app/brand/models.py
from sqlalchemy import Column, Integer, String, Float, Boolean #type: ignore
from app.database import Base

class BrandSettings(Base):
    __tablename__ = "brand_settings"
    id = Column(Integer, primary_key=True)
    # simple single-tenant for MVP
    studio_name = Column(String(200), nullable=True)

    logo_path = Column(String(512), nullable=True)

    wm_enabled = Column(Boolean, default=False)
    wm_use_logo = Column(Boolean, default=True)  # True: use logo; False: text
    wm_text = Column(String(200), nullable=True)
    wm_opacity = Column(Float, default=0.25)     # 0..1
    wm_position = Column(String(12), default="bottom-right") # tl,t, tr, l, c, r, bl, b, br
    wm_scale = Column(Float, default=0.2)        # fraction of long edge
    wm_apply_previews = Column(Boolean, default=True)
    wm_apply_thumbs = Column(Boolean, default=False)
    wm_apply_downloads = Column(Boolean, default=False)
