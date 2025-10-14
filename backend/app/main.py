# main.py
from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from app.database import get_db, init_db
from app.auth.controllers import user_controller, auth_controller, admin_controller
from app.auth.services.user_service import create_super_admin
from os import getenv
from dotenv import load_dotenv # type: ignore
from slowapi import Limiter # type: ignore
from slowapi.util import get_remote_address # type: ignore
from starlette.middleware import Middleware # type: ignore
from slowapi.middleware import SlowAPIMiddleware # type: ignore
from slowapi.errors import RateLimitExceeded # type: ignore
from fastapi.responses import JSONResponse # type: ignore
from app.rate_limiter import limiter
from app.gallery.controllers import gallery_controller, favorites_controller
from app import config
from starlette.staticfiles import StaticFiles #type:ignore
from app.brand import controllers as brand_controllers
from app.settings import settings

load_dotenv()

# The 'lifespan=lifespan' parameter is the critical fix.
app = FastAPI(title="Alluring Lens Studios API", version="1.0.0", debug=settings.DEBUG)
print(config.FRONTEND_ORIGINS)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(settings.DEBUG)
@app.get("/config")
def read_config():
    return {
        "environment": settings.ENV,
        "debug": settings.DEBUG,
        "database": settings.DATABASE_URL,
    }


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
app.include_router(brand_controllers.router)
app.include_router(favorites_controller.router)