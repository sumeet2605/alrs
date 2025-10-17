# services/user_service.py
from sqlalchemy.orm import Session #type: ignore
from sqlalchemy.exc import IntegrityError  #type: ignore
from fastapi import HTTPException   #type: ignore
from app.auth.models.user_model import User 
from app.auth.schemas.user_schema import UserRegistration
from app.auth.utils.password_hasher import get_password_hash
from datetime import datetime, timedelta
from app.auth.models.role_model import Role

def create_new_user(user_data: UserRegistration, db: Session) -> User:
    """
    Creates a new user in the database.
    Args:
        user_data: The user's registration data.
        db: The database session.
    Raises:
        HTTPException: If the email is already registered.
    Returns:
        The newly created user object.
    """
    if get_user_by_email(user_data.email, db):
        raise HTTPException(
            status_code=409,
            detail="Email already registered."
        )

    # Then check for existing username
    if get_user_by_username(user_data.username, db):
        raise HTTPException(
            status_code=409,
            detail="Username already registered."
        )

    # If no conflicts, create the user
    hashed_password = get_password_hash(user_data.password)
    # print(user_data.role)
    role = db.query(Role).filter(Role.id == user_data.role).first()
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role = role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def get_user_by_email(email: str, db: Session) -> User | None:
    """Retrieves a user by their email address."""
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(username: str, db: Session) -> User | None:
    """Retrieves a user by their email address."""
    return db.query(User).filter(User.username == username).first()

def create_super_admin(db:Session, username: str, email: str, password: str):
    if not get_user_by_email(email=email, db=db):
        hashed_password = get_password_hash(password)
        super_admin = User(
            username = username,
            email = email,
            hashed_password = hashed_password,
            full_name = "Admin",
            role = "Owner",
            is_active = True
        )

        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)
        print(f"Super admin with email '{email}' created successfully.")
    else:
        print(f"Super admin with email '{email}' already exists.")


def get_all_users(db: Session) -> list[User]:
    """Retrieves a list of all users from the database."""
    return db.query(User).all()

def update_user_failed_attempts(user: User, db: Session, increment: bool = True):
    """Updates the failed login attempts for a user."""
    if increment:
        user.failed_login_attempts += 1
    else:
        user.failed_login_attempts = 0  # Reset on successful login

    # Lock the account if failed attempts exceed threshold
    if user.failed_login_attempts >= 5:
        user.is_locked = True

    db.commit()
    db.refresh(user)


def get_all_roles(db:Session) -> list[Role]:
    return db.query(Role).all()