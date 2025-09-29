from fastapi.security import OAuth2PasswordBearer # type: ignore
from typing import Annotated
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")
# app/controllers/admin_controller.py
from fastapi import APIRouter, Depends, status #type: ignore
from sqlalchemy.orm import Session #type: ignore
from app.database import get_db
from app.auth.services.dependencies import has_permission
from app.auth.schemas.admin_schema import RoleBulkCreate, PermissionBulkCreate
from app.auth.services import admin_service
from typing import List

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
)

@router.post("/roles/bulk", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(has_permission("roles:create"))])
def bulk_create_roles(
    roles: List[RoleBulkCreate],
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Bulk creates a list of roles."""
    created_roles = admin_service.bulk_create_roles(db, roles)
    return {"message": f"{len(created_roles)} roles created successfully."}

@router.post("/permissions/bulk", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(has_permission("permissions:create"))])
def bulk_create_permissions(
    permissions: List[PermissionBulkCreate],
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Bulk creates a list of permissions."""
    created_permissions = admin_service.bulk_create_permissions(db, permissions)
    return {"message": f"{len(created_permissions)} permissions created successfully."}