"""Seed role-permission mapping

Revision ID: 5d7b5cf16230
Revises: 15468fe18efe
Create Date: 2025-09-26 13:36:07.128566

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column, select

# revision identifiers, used by Alembic.
revision: str = '5d7b5cf16230'
down_revision: Union[str, Sequence[str], None] = '15468fe18efe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ROLE_PERMISSIONS_MAP = {
    "Owner": [
        'admin:manage_roles', 'admin:read_all_users', 'photos:upload', 
        'photos:read_all', 'photos:read_own', 'photos:edit_all', 
        'photos:delete_all', 'finance:view_invoices', 'finance:create_invoice', 
        'marketing:publish', 'marketing:campaigns', 'client:download_hires'
    ],
    "Photographer": [
        'photos:upload', 'photos:read_own', 'photos:read_all', 
    ],
    "Editor": [
        'photos:read_all', 'photos:edit_all', 'photos:delete_all', 
        'marketing:publish',
    ],
    "Finance": [
        'finance:view_invoices', 'finance:create_invoice',
    ],
    "Marketing": [
        'photos:read_all', 'marketing:publish', 'marketing:campaigns',
    ],
    "Client": [
        'photos:read_own', 'client:download_hires'
    ],
    "Read-only": [
        'photos:read_all', 'finance:view_invoices', 
    ]
}

def upgrade() -> None:
    """Upgrade schema and map roles to permissions."""
    conn = op.get_bind()
    
    # --- 1. Fetch all Role and Permission IDs ---
    
    roles_table = table('roles', column('id'), column('name'))
    permissions_table = table('permissions', column('id'), column('name'))
    
    # Get IDs of all roles
    roles = conn.execute(select(roles_table)).fetchall()
    role_name_to_id = {r.name: r.id for r in roles}
    
    # Get IDs of all permissions
    permissions = conn.execute(select(permissions_table)).fetchall()
    permission_name_to_id = {p.name: p.id for p in permissions}
    
    # --- 2. Build the final data list for the join table ---
    
    role_permissions_data = []
    
    for role_name, required_permissions in ROLE_PERMISSIONS_MAP.items():
        role_id = role_name_to_id.get(role_name)
        if not role_id:
            print(f"Warning: Role '{role_name}' not found. Skipping mapping.")
            continue
            
        for perm_name in required_permissions:
            permission_id = permission_name_to_id.get(perm_name)
            if not permission_id:
                print(f"Warning: Permission '{perm_name}' not found. Skipping mapping.")
                continue
            
            role_permissions_data.append({
                'role_id': role_id,
                'permission_id': permission_id
            })

    # --- 3. Bulk Insert ---
    
    role_permissions_table = sa.table(
        'role_permissions',
        sa.column('role_id', sa.Integer),
        sa.column('permission_id', sa.Integer),
    )
    
    op.bulk_insert(role_permissions_table, role_permissions_data)


def downgrade() -> None:
    """Downgrade schema by clearing the role_permissions join table."""
    # This cleans up the join table for all roles defined in the map.
    
    conn = op.get_bind()
    roles_table = table('roles', column('id'), column('name'))
    
    # Get IDs of the roles we inserted mappings for
    role_names_to_delete = list(ROLE_PERMISSIONS_MAP.keys())
    
    roles = conn.execute(
        select(roles_table.c.id).where(roles_table.c.name.in_(role_names_to_delete))
    ).fetchall()
    role_ids_to_delete = [r.id for r in roles]
    
    if role_ids_to_delete:
        role_permissions_table = sa.table(
            'role_permissions',
            sa.column('role_id', sa.Integer),
            sa.column('permission_id', sa.Integer),
        )
        
        # Delete only the mappings for the roles we created
        op.execute(
            sa.delete(role_permissions_table).where(
                role_permissions_table.c.role_id.in_(role_ids_to_delete)
            )
        )