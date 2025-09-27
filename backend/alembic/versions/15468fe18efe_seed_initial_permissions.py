"""Seed initial permissions

Revision ID: 15468fe18efe
Revises: 45605112de6d
Create Date: 2025-09-26 13:31:48.838567

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '15468fe18efe'
down_revision: Union[str, Sequence[str], None] = '45605112de6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema and seed permissions."""
    permissions_table = sa.table(
        'permissions',
        sa.column('name', sa.String),
    )
    
    # List of all permissions to insert
    permissions_data = [
        {'name': 'admin:manage_roles'},
        {'name': 'admin:read_all_users'},
        {'name': 'photos:upload'},
        {'name': 'photos:read_all'},
        {'name': 'photos:read_own'},
        {'name': 'photos:edit_all'},
        {'name': 'photos:delete_all'},
        {'name': 'finance:view_invoices'},
        {'name': 'finance:create_invoice'},
        {'name': 'marketing:publish'},
        {'name': 'marketing:campaigns'},
        {'name': 'client:download_hires'},
    ]
    
    op.bulk_insert(permissions_table, permissions_data)


def downgrade() -> None:
    """Downgrade schema by removing permissions using sa.delete()."""
    permission_names = [
        'admin:manage_roles', 'admin:read_all_users', 'photos:upload', 
        'photos:read_all', 'photos:read_own', 'photos:edit_all', 
        'photos:delete_all', 'finance:view_invoices', 'finance:create_invoice', 
        'marketing:publish', 'marketing:campaigns', 'client:download_hires'
    ]
    
    # 1. Define the table object with a column
    permissions_table = sa.table(
        'permissions',
        sa.column('name', sa.String),
    )
    
    # 2. Use SQLAlchemy's delete construct, which is safer than f-strings
    op.execute(
        sa.delete(permissions_table).where(
            permissions_table.c.name.in_(permission_names)
        )
    )
