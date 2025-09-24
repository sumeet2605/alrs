# controllers/user_controller.py
from fastapi import APIRouter, Depends, status, HTTPException # type: ignore 
from sqlalchemy.orm import Session  # type: ignore
from app.schemas.user_schema import UserRegistration, UserResponse
from app.services import user_service
from app.database import get_db
from app.models.user_model import User

router = APIRouter(tags=["users"])


def get_current_owner(db: Session = Depends(get_db)):
    """Placeholder dependency to get the current authenticated owner."""
    owner = db.query(User).filter(User.role == "Owner").first()
    if not owner:
        raise HTTPException(status_code=403, detail="Not authorized.")
    return owner

@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    response_description="User successfully registered."
)
def register_user(
    user_data: UserRegistration,
    db: Session = Depends(get_db)
):
    """
    Handles user registration by validating input and creating a new user.
    - **email**: The user's email address.
    - **password**: A strong password that meets complexity rules.
    """
    user_service.create_new_user(user_data, db)
    # TODO: Integration with email service (e.g., SendGrid) for confirmation email.
    return {"message": "User registered successfully."}

@router.get(
    "/users",
    status_code=status.HTTP_200_OK,
    summary="List all users",
    response_model=list[UserResponse]
)
def list_all_users(db: Session = Depends(get_db)):
    """
    Retrieves a list of all registered users.
    This endpoint is restricted to authenticated 'Owner' users.
    """
    all_users = user_service.get_all_users(db)
    return all_users