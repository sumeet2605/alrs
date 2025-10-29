import os
from pydantic_settings import BaseSettings #type: ignore
from pydantic import AnyUrl, field_validator, model_validator #type: ignore

class Settings(BaseSettings):
    # core
    ENV: str = "development"
    DEBUG: bool = True

    # auth & tokens
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # email
    RESEND_API_KEY: str | None = None
    EMAIL_SENDER: str | None = None

    # db
    SQLALCHEMY_DATABASE_URL: str

    # storage
    STORAGE_BACKEND: str = "local"   # "local" | "gcs"
    GCS_BUCKET_NAME: str | None = None
    GCS_SIGNED_URL_EXP_SECONDS: int = 3600
    GCS_CREDENTIALS_JSON: str | None = None
    GCP_PROJECT_ID: str | None = None

    SECURE: bool = False  # use secure cookies
    SAMESITE: str = "lax"  # cookie samesite policy

    
    CLOUD_TASKS_QUEUE: str
    CLOUD_TASKS_LOCATION: str
    CLOUD_TASKS_OIDC_SERVICE_ACCOUNT: str
    CLOUD_TASKS_TARGET_URL: str

    @field_validator("ENV")
    @classmethod
    def env_allowed(cls, v: str) -> str:
        v = v.lower()
        if v not in {"development", "production", "staging", "test"}:
            raise ValueError("ENV must be one of development|production|staging|test")
        return v

    # ----------------------------------------------------
    # NEW VALIDATOR FOR COOKIE ATTRIBUTES
    # ----------------------------------------------------
    @model_validator(mode='after')
    def set_cookie_attributes(self) -> 'Settings':
        """Sets SECURE and SAMESITE based on the environment."""
        
        # Production/Staging require Secure=True and SameSite=None 
        # for cross-site cookie transmission (API separate from client)
        if self.ENV in {"production", "staging"}:
            self.SECURE = True
            # Use None for cross-site production, must be capitalized
            self.SAMESITE = "None" 
        else:
            # Development/Test environments use Lax (works with proxy) 
            # and Secure=False (required for local HTTP)
            self.SECURE = False
            self.SAMESITE = "Lax"

        return self
    # ----------------------------------------------------
    class Config:
        # pick env file based on ENV exported in the OS
        env_file = ".env.production" if os.getenv("ENV") == "production" else ".env.development"
        env_file_encoding = "utf-8"

settings = Settings()
