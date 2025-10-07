"""added file id

Revision ID: 8b825436b0ed
Revises: 6d76adc8b20c
Create Date: 2025-09-29 12:56:56.910650

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b825436b0ed'
down_revision: Union[str, Sequence[str], None] = '6d76adc8b20c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade():
    # If this migration also added the `file_id` column, keep that logic (if already present skip)
    # Now add UNIQUE constraint in SQLite batch mode:
    with op.batch_alter_table("photos", recreate="always") as batch_op:
        # Ensure the column exists; if not, add column here:
        batch_op.add_column(sa.Column('file_id', sa.String(length=36), nullable=True))
        batch_op.create_unique_constraint("uq_photos_file_id", ["file_id"])


def downgrade():
    with op.batch_alter_table("photos", recreate="always") as batch_op:
        batch_op.drop_constraint("uq_photos_file_id", type_="unique")
