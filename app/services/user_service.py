# services/user_service.py
from sqlalchemy.orm import Session #type: ignore
from sqlalchemy.exc import IntegrityError  #type: ignore
from fastapi import HTTPException   #type: ignore
from app.models.user_model import User 
from app.schemas.user_schema import UserRegistration
from app.utils.password_hasher import get_password_hash

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
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password
    )
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Email already registered."
        )

def get_user_by_email(email: str, db: Session) -> User | None:
    """Retrieves a user by their email address."""
    return db.query(User).filter(User.email == email).first()


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