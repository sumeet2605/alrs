from app.auth.schemas.auth_schema import ForgotPasswordRequest, ResetPasswordRequest

from app.auth.schemas.auth_schema import ChangePasswordRequest

# app/controllers/auth_controller.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie # type: ignore
from sqlalchemy.orm import Session  #type: ignore
from typing import Annotated
from app.database import get_db
from app.auth.services import auth_service
from app.auth.schemas.auth_schema import LoginRequest, Token
from app.auth.models.user_model import User
from typing import Annotated
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm  #type:ignore
from os import getenv
from app.auth.schemas.user_schema import UserResponse
from app.auth.models.refresh_token_model import RefreshToken
from datetime import datetime
from app.auth.services.user_service import get_user_by_username
from app.rate_limiter import limiter

router = APIRouter(tags=["authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")
REFRESH_COOKIE_NAME = getenv("REFRESH_COOKIE_NAME", "refresh_token")
REFRESH_COOKIE_MAX_AGE = int(getenv("REFRESH_COOKIE_MAX_AGE", 60*60*24*7))  # seconds


@router.post("/login", response_model=Token, summary="User Login", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def user_login(
    request: Request,
    response: Response,
    login_request: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    """
    Handles user login, verifies credentials, and returns a JWT access token.
    """
    ip_address = request.client.host
    token = auth_service.handle_user_login(
        db, 
        login_request.username, 
        login_request.password, 
        ip_address,
        request_headers=request.headers
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        token.refresh_token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=False,  # For local development
        samesite="lax"  # For local development
    )
    return {"access_token": token.access_token, "token_type": "bearer"}

@router.post("/refresh", response_model=Token, summary="Refresh Access Token", status_code=status.HTTP_200_OK)
def refresh_token(
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(None, alias="refresh_token"),
    db: Session = Depends(get_db)
):
    """
    Exchanges a valid refresh token for a new access token and refresh token.
    """

    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing.")
    ip_address = request.client.host
    
    # 1. Decode and validate the refresh token
    token_data = auth_service.decode_token(refresh_token)
    
    jti = token_data.jti if hasattr(token_data, "jti") else getattr(token_data, "jti", None)
    # verify DB record
    rt = db.query(RefreshToken).filter(RefreshToken.jti == jti, RefreshToken.revoked == False).first()
    if not rt:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")
    # rotate: mark old revoked and create new refresh token
    
    # create new tokens
    new_access_token = auth_service.create_access_token(data={"sub": token_data.username})
    new_refresh_encoded, refresh_payload = auth_service.create_refresh_token(data={"sub": token_data.username})
    new_rt = RefreshToken(
        user_id=rt.user_id,
        jti=refresh_payload["jti"],
        issued_at=datetime.now(),
        expires_at=refresh_payload["exp"],
        revoked=False,
        ip_address=None,
        user_agent=None
    )
    db.add(new_rt)
    db.commit()
    # set cookie
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        new_refresh_encoded,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=False,  # For local development
        samesite="lax"  # For local development
    )
    db.add(rt)
    db.commit()
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse, summary="Get Current User", status_code=status.HTTP_200_OK)
def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """
    Retrieves the currently authenticated user's information based on the provided JWT.
    """
    # 1. Decode and validate the access token
    token_data = auth_service.decode_token(token)
    
    # 2. Find the user associated with the token
    user = db.query(User).filter(User.username == token_data.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token.")
    
    return user

# Change password endpoint
@router.post("/change-password", summary="Change user password", status_code=status.HTTP_200_OK)
def change_password(
    request: ChangePasswordRequest,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    token_data = auth_service.decode_token(token)
    auth_service.change_user_password(db, token_data.username, request.current_password, request.new_password)
    return {"message": "Password changed successfully."}


# Forgot Password endpoint
@router.post("/forgot-password", summary="Request password reset", status_code=status.HTTP_200_OK)
def forgot_password(request: ForgotPasswordRequest, token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    auth_service.handle_forgot_password(db, request.email)
    return {"message": "If the email exists, a reset link has been sent."}

# Reset Password endpoint
@router.post("/reset-password", summary="Reset password using token", status_code=status.HTTP_200_OK)
def reset_password(request: ResetPasswordRequest, token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    auth_service.handle_reset_password(db, request.token, request.new_password)
    return {"message": "Password has been reset successfully."}
