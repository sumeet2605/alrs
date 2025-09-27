from sqlalchemy import create_engine #type: ignore
from sqlalchemy.ext.declarative import declarative_base #type: ignore
from sqlalchemy.orm import sessionmaker #type: ignore
from os import getenv
from dotenv import load_dotenv #type: ignore
load_dotenv()

SQLALCHEMY_DATABASE_URL = getenv("SQLALCHEMY_DATABASE_URL")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)     

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import app.models  # Import your models here to register them with SQLAlchemy
    Base.metadata.create_all(bind=engine)