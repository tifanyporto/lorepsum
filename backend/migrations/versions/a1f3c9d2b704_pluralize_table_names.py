"""pluralize table names

Revision ID: a1f3c9d2b704
Revises: 6c2c163a7084
Create Date: 2026-09-03 15:02:11.000000

Written by hand: --autogenerate cannot see a rename. It would see the old
table disappear and a new one appear, and write drop_table + create_table,
destroying the data. rename_table preserves everything, and Postgres carries
the foreign keys along with it (they point at the table's internal id, not
at its name).

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1f3c9d2b704'
down_revision: Union[str, Sequence[str], None] = '6c2c163a7084'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = [
    ("entity_type", "entity_types"),
    ("entity", "entities"),
    ("relationship", "relationships"),
    ("entity_image", "entity_images"),
]

# indexes declared in models.py carry the table name; renaming a table does
# not rename its indexes, so that is done separately
INDEXES = [
    ("ix_relationship_source", "ix_relationships_source"),
    ("ix_relationship_target", "ix_relationships_target"),
    ("ix_entity_image_cover", "ix_entity_images_cover"),
    ("ix_entity_image_entity", "ix_entity_images_entity"),
]


def upgrade() -> None:
    """Upgrade schema."""
    for old, new in TABLES:
        op.rename_table(old, new)
    for old, new in INDEXES:
        op.execute(f'ALTER INDEX {old} RENAME TO {new}')


def downgrade() -> None:
    """Downgrade schema."""
    for old, new in INDEXES:
        op.execute(f'ALTER INDEX {new} RENAME TO {old}')
    for old, new in TABLES:
        op.rename_table(new, old)
