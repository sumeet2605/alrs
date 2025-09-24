# main.py
from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from app.database import get_db, init_db
from app.controllers import user_controller
from app.services.user_service import create_super_admin
from os import getenv
from dotenv import load_dotenv # type: ignore
from app.startup import lifespan

load_dotenv()


# The 'lifespan=lifespan' parameter is the critical fix.
app = FastAPI(title="Alluring Lens Studios API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Alluring Lens Studios API!"}

@app.get("/health")
async def health_check():
    return {"status": "OK"}


app.include_router(user_controller.router, prefix="/api")