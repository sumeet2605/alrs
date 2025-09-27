
# app/schemas/auth_schema.py
from pydantic import BaseModel #type: ignore
from typing import Optional

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str

# Schema for password change
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# Schema for forgot password
class ForgotPasswordRequest(BaseModel):
    email: str

# Schema for reset password
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str