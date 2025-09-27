"""Seed super admin user

Revision ID: 45605112de6d
Revises: 37694a457f19
Create Date: 2025-09-25 15:16:23.538290

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from os import getenv
import bcrypt
from sqlalchemy.sql import table, column


# revision identifiers, used by Alembic.
revision: str = '45605112de6d'
down_revision: Union[str, Sequence[str], None] = '37694a457f19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema and seed the super admin user."""
    # Get credentials from environment variables
    admin_username = getenv("ADMIN_USERNAME", "admin")
    admin_email = getenv("ADMIN_EMAIL", "admin@admin.com")
    admin_password = getenv("ADMIN_PASSWORD", "Admin@123")

    if not all([admin_username, admin_email, admin_password]):
        print("Warning: ADMIN credentials not set in environment variables. Super admin not created.")
        return

    # Hash the password using bcrypt
    hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Get the ID of the "Owner" role
    conn = op.get_bind()
    owner_role_id = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'Owner'")
    ).scalar()

    if not owner_role_id:
        print("Warning: 'Owner' role not found. Super admin cannot be created.")
        return

    # Define the users table for bulk insert
    users_table = table(
        'users',
        column('username', sa.String),
        column('email', sa.String),
        column('full_name', sa.String),
        column('hashed_password', sa.String),
        column('role_id', sa.Integer),
        column('is_active', sa.Boolean)
    )

    op.bulk_insert(users_table, [
        {
            'username': admin_username,
            'email': admin_email,
            'full_name': "Super Administrator",
            'hashed_password': hashed_password,
            'role_id': owner_role_id,
            'is_active': True
        }
    ])



def downgrade() -> None:
    """Downgrade schema by removing the super admin user."""
    admin_username = getenv("ADMIN_USERNAME", "admin")
    op.execute(f"DELETE FROM users WHERE username = '{admin_username}';")
