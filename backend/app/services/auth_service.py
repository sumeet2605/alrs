# app/services/auth_service.py
from datetime import datetime, timedelta
from typing import Any
from os import getenv

import bcrypt # type: ignore
from jose import jwt, JWTError # type: ignore

from app.models.user_model import User
from app.models.login_audit_model import LoginAudit
from app.services.user_service import get_user_by_username
from app.schemas.auth_schema import Token, TokenData
from sqlalchemy.orm import Session #type: ignore
from fastapi import HTTPException, status   #type: ignore

REFRESH_TOKEN_EXPIRE_DAYS = int(getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))
ACCESS_TOKEN_EXPIRE_MINUTES = int(getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
SECRET_KEY = getenv("SECRET_KEY")
ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed one."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Creates a JWT access token with an expiration time."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Creates a JWT refresh token with a longer expiration time."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> TokenData:
    """Decodes a JWT token and returns the payload data."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token.")
        return TokenData(username=username)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token.")

def handle_user_login(db: Session, username: str, password: str, ip_address: str) -> Token:
    """
    Handles user login, verifies credentials, and generates a JWT.
    All business logic is contained here to keep the controller thin.
    """
    user = get_user_by_username(username, db)
    
    # 1. Check if user exists and is not locked out
    if not user or (user.is_locked and user.lockout_until > datetime.utcnow()):
        # Log failed attempt
        audit_log = LoginAudit(
            user_id=user.id if user else None,
            is_successful=False,
            ip_address=ip_address
        )
        db.add(audit_log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password, or account is locked."
        )

    # 2. Verify password
    if not verify_password(password, user.hashed_password):
        # Handle failed attempts and account lock
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5: # Lockout threshold
            user.lockout_until = datetime.utcnow() + timedelta(minutes=15) # 15 min lock
        
        # Log failed attempt
        audit_log = LoginAudit(
            user_id=user.id,
            is_successful=False,
            ip_address=ip_address
        )
        db.add(audit_log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password, or account is locked."
        )

    # 3. Successful login
    user.failed_login_attempts = 0
    user.lockout_until = None
    
    # Log successful attempt
    audit_log = LoginAudit(
        user_id=user.id,
        is_successful=True,
        ip_address=ip_address
    )
    db.add(audit_log)
    db.commit()

    # Create and return JWT
    access_token = create_access_token(
        data={"sub": user.username}
    )
    refresh_token = create_refresh_token(data={"sub": user.username})
    return Token(access_token=access_token,refresh_token=refresh_token, token_type="bearer")