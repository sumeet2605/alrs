from sqlalchemy import create_engine #type: ignore
from sqlalchemy.ext.declarative import declarative_base #type: ignore
from sqlalchemy.orm import sessionmaker #type: ignore
from os import getenv
from dotenv import load_dotenv #type: ignore
from app.settings import settings


SQLALCHEMY_DATABASE_URL = settings.SQLALCHEMY_DATABASE_URL

if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_size=20, max_overflow=40, pool_recycle=3600, pool_timeout=30)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)     

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import app.auth.models  # Import your models here to register them with SQLAlchemy
    Base.metadata.create_all(bind=engine)