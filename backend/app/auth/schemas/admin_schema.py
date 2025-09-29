# app/schemas/admin_schema.py
from pydantic import BaseModel #type: ignore
from typing import List, Optional

class RoleBulkCreate(BaseModel):
    name: str
    description: Optional[str] = None

class PermissionBulkCreate(BaseModel):
    name: str