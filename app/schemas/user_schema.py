# schemas/user_schema.py
from pydantic import BaseModel, EmailStr, Field #type: ignore

class UserRegistration(BaseModel):
    """Pydantic model for user registration data."""
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Unique username for the user."
    )
    email: EmailStr
    full_name: str | None = Field(
        None,
        max_length=100,
        description="Optional full name of the user."
    )
    password: str = Field(
        ...,
        min_length=8,
        description="Password must meet complexity rules."
    )

class UserResponse(BaseModel):
    """Pydantic model for user data in API responses."""
    username: str
    email: EmailStr
    full_name: str | None
    is_active: bool
    role: str

    class Config:
        from_attributes = True