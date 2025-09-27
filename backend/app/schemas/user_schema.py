# schemas/user_schema.py
from pydantic import BaseModel, EmailStr, Field, ConfigDict #type: ignore
from typing import Optional

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
    role: str = Field(
        "Client",
        description="Role of the user, defaults to 'Client'."
    )

class RoleResponse(BaseModel):
    """Schema for reading Role information."""
    # Use Pydantic V2 config for ORM compatibility
    model_config = ConfigDict(from_attributes=True) 
    
    id: int
    name: str

class UserResponse(BaseModel):
    """Pydantic model for user data in API responses."""
    username: str
    email: EmailStr
    full_name: str | None
    is_active: bool
    role: RoleResponse 

    class Config:
        from_attributes = True