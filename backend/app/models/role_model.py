# app/models/role_model.py
from sqlalchemy import Column, Integer, String, Table, ForeignKey #type: ignore
from sqlalchemy.orm import relationship #type: ignore
from app.database import Base

# Join table for the many-to-many relationship between roles and permissions
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', ForeignKey('permissions.id'), primary_key=True)
)

class Role(Base):
    """Represents a user role."""
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255))

    users = relationship("User", back_populates="role")
    permissions = relationship(
        "Permission",
        secondary=role_permissions,
        back_populates="roles"
    )

class Permission(Base):
    """Represents a specific permission."""
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    
    roles = relationship(
        "Role",
        secondary=role_permissions,
        back_populates="permissions"
    )