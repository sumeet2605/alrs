# app/services/admin_service.py
from sqlalchemy.orm import Session #type: ignore
from sqlalchemy.exc import IntegrityError #type: ignore
from app.models.role_model import Role, Permission
from app.schemas.admin_schema import RoleBulkCreate, PermissionBulkCreate
from fastapi import HTTPException, status #type: ignore
from typing import List

def bulk_create_roles(db: Session, roles_data: List[RoleBulkCreate]) -> list[Role]:
    """Bulk creates roles, handling duplicates."""
    try:
        new_roles = [Role(name=role.name, description=role.description) for role in roles_data]
        db.add_all(new_roles)
        db.commit()
        return new_roles
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="One or more roles already exist."
        )

def bulk_create_permissions(db: Session, permissions_data: List[PermissionBulkCreate]) -> list[Permission]:
    """Bulk creates permissions, handling duplicates."""
    try:
        new_permissions = [Permission(name=perm.name) for perm in permissions_data]
        db.add_all(new_permissions)
        db.commit()
        return new_permissions
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="One or more permissions already exist."
        )