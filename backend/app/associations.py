# app/associations.py
from sqlalchemy import Table, Column, Integer, ForeignKey #type: ignore
from app.database import Base

session_galleries = Table(
    "session_galleries",
    Base.metadata,
    Column("session_id", Integer, ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True),
    Column("gallery_id", Integer, ForeignKey("galleries.id", ondelete="CASCADE"), primary_key=True),
)
