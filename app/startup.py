# app/startup.py
from fastapi import FastAPI # type: ignore
from contextlib import asynccontextmanager
from app.database import get_db, init_db
from app.services.user_service import create_super_admin
from os import getenv
from dotenv import load_dotenv # type: ignore

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown events.
    Initializes the database and creates a super admin on startup.
    """
    print("Application startup...")
    init_db()
    db = next(get_db())
    admin_email = getenv("ADMIN_EMAIL", "admin@admin.com")
    admin_password = getenv("ADMIN_PASSWORD", "Admin@123")
    admin_username = getenv("ADMIN_USERNAME", "admin")
    if admin_email and admin_password and admin_username:
        create_super_admin(db, admin_username, admin_email, admin_password)
    else:
        print("Warning: SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD environment variables not set. Super admin not created.")
    
    yield
    print("Application shutdown.")