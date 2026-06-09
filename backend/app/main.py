# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_db, init_db
from app.auth.controllers import user_controller, auth_controller, admin_controller
from app.auth.services.user_service import create_super_admin
from os import getenv
from dotenv import load_dotenv
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.middleware import Middleware
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse
from app.rate_limiter import limiter
from app.gallery.controllers import gallery_controller, favorites_controller
from app import config
from starlette.staticfiles import StaticFiles
from app.api.admin_cleanup import router as cleanup_router
from app.api.whatsapp_webhook import router as whatsapp_router
from app.api.whatsapp_admin import router as whatsapp_admin_router

load_dotenv()

app = FastAPI(title="Alluring Lens Studios API", version="1.0.0")
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory=config.MEDIA_ROOT), name="media")

app.state.limiter = limiter

@app.get("/")
async def root():
    return {"message": "Welcome to Alluring Lens Studios API!"}

@app.get("/health")
async def health_check():
    return {"status": "OK"}

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})

app.include_router(user_controller.router, prefix="/api")
app.include_router(auth_controller.router, prefix="/api") 
app.include_router(admin_controller.router, prefix="/api")
app.include_router(gallery_controller.router, prefix="/api")
app.include_router(favorites_controller.router)
app.include_router(cleanup_router)
app.include_router(whatsapp_router)
app.include_router(whatsapp_admin_router)
