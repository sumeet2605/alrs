from app.schemas.auth_schema import ForgotPasswordRequest, ResetPasswordRequest

from app.schemas.auth_schema import ChangePasswordRequest

# app/controllers/auth_controller.py
from fastapi import APIRouter, Depends, HTTPException, status, Request # type: ignore
from sqlalchemy.orm import Session  #type: ignore
from typing import Annotated
from app.database import get_db
from app.services import auth_service
from app.schemas.auth_schema import LoginRequest, Token
from app.models.user_model import User
from typing import Annotated
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm  #type:ignore
from os import getenv
from app.schemas.user_schema import UserResponse

router = APIRouter(tags=["authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

@router.post("/login", response_model=Token, summary="User Login", status_code=status.HTTP_200_OK)
def user_login(
    request: Request,
    login_request: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    """
    Handles user login, verifies credentials, and returns a JWT access token.
    """
    print(login_request)
    ip_address = request.client.host
    token = auth_service.handle_user_login(
        db, 
        login_request.username, 
        login_request.password, 
        ip_address
    )
    return token

@router.post("/refresh", response_model=Token, summary="Refresh Access Token", status_code=status.HTTP_200_OK)
def refresh_token(
    request: Request,
    refresh_token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """
    Exchanges a valid refresh token for a new access token and refresh token.
    """
    ip_address = request.client.host
    
    # 1. Decode and validate the refresh token
    token_data = auth_service.decode_token(refresh_token)
    
    # 2. Find the user associated with the token
    user = db.query(User).filter(User.username == token_data.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    # 3. Create new access and refresh tokens
    new_access_token = auth_service.create_access_token(data={"sub": user.username})
    new_refresh_token = auth_service.create_refresh_token(data={"sub": user.username})

    # TODO: In a more advanced system, you might want to invalidate the old refresh token
    # to prevent token reuse.

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse, summary="Get Current User", status_code=status.HTTP_200_OK)
def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """
    Retrieves the currently authenticated user's information based on the provided JWT.
    """
    print(token)
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
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    auth_service.handle_forgot_password(db, request.email)
    return {"message": "If the email exists, a reset link has been sent."}

# Reset Password endpoint
@router.post("/reset-password", summary="Reset password using token", status_code=status.HTTP_200_OK)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    auth_service.handle_reset_password(db, request.token, request.new_password)
    return {"message": "Password has been reset successfully."}