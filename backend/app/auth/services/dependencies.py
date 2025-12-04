# app/dependencies.py 
from fastapi import Depends, HTTPException, status #type: ignore
from sqlalchemy.orm import Session, joinedload #type: ignore
from app.database import get_db
from app.auth.services import user_service, auth_service
from app.auth.models.user_model import User
from app.auth.models.role_model import Role
from typing import Annotated, Optional
from fastapi.security import OAuth2PasswordBearer #type: ignore

# This dependency extracts the token from the request header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login",  auto_error=True)

# Optional OAuth2 scheme for endpoints where token is optional (won't auto-raise)
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/login", auto_error=False)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
) -> User:
    """
    Decodes the JWT token and returns the corresponding User object.
    """
    try:
        token_data = auth_service.decode_token(token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials."
        )

    user = user_service.get_user_by_username(token_data.username, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )
    return user

def get_optional_current_user(
    token: Annotated[Optional[str], Depends(oauth2_scheme_optional)],
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Returns the user object if a valid auth token is provided, otherwise returns None.
    Uses oauth2_scheme_optional (auto_error=False) so missing token does NOT raise.
    """
    # print(token)
    if not token:
        return None

    try:
        # reuse existing get_current_user logic but avoid double-dependency
        token_data = auth_service.decode_token(token)
    except Exception:
        # token invalid -> behave as unauthenticated
        return None
    # print(token_data.username)
    user = user_service.get_user_by_username(token_data.username, db)
    # print(user)
    if not user:
        return None
    return user

def has_permission(permission_name: str):
    """
    Returns a dependency that checks if the current user has the required permission.
    """
    def permission_checker(
        current_user: Annotated[User, Depends(get_current_user)],
        db: Session = Depends(get_db)
    ):
        # We need to load the user's role and permissions
        # Note: SQLAlchemy's lazy loading might handle this automatically if configured.
        user_with_role = db.query(User).filter(User.id == current_user.id).options(
            # Eager load the role and its permissions to avoid extra queries
            joinedload(User.role).joinedload(Role.permissions)
        ).first()
        
        # Check if the user has the permission
        if not any(perm.name == permission_name for perm in user_with_role.role.permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User does not have '{permission_name}' permission."
            )
    return permission_checker