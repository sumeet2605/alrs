"""seed inital roles

Revision ID: 37694a457f19
Revises: 7f9fe6d1a7b9
Create Date: 2025-09-25 15:14:40.090933

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37694a457f19'
down_revision: Union[str, Sequence[str], None] = '7f9fe6d1a7b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema and seed roles."""
    roles_table = sa.table(
        'roles',
        sa.column('name', sa.String),
        sa.column('description', sa.String),
    )
    
    op.bulk_insert(roles_table, [
        {'name': 'Owner', 'description': 'Full administrative control over the system.'},
        {'name': 'Photographer', 'description': 'Can manage photo shoots and upload images.'},
        {'name': 'Editor', 'description': 'Can edit and manage photo content.'},
        {'name': 'Finance', 'description': 'Manages financial records and invoices.'},
        {'name': 'Client', 'description': 'A standard user with limited access.'},
        {'name': 'Marketing', 'description': 'Manages marketing campaigns and public content.'},
        {'name': 'Read-only', 'description': 'Can view but not modify any resources.'},
    ])


def downgrade() -> None:
    """Downgrade schema by removing roles."""
    op.execute("DELETE FROM roles WHERE name IN ('Owner', 'Photographer', 'Editor', 'Finance', 'Client', 'Marketing', 'Read-only');")
