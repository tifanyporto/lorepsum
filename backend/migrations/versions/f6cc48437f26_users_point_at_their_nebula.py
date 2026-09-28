"""users point at their Nebula

Revision ID: f6cc48437f26
Revises: 44e1aea5072f
Create Date: 2026-09-28 12:52:47.000000

Written by hand: it carries data across, which --autogenerate cannot do.

The Nebula is the home of every entity that has no other. Until now it was
only a name in the seed, and a lore can be renamed or deleted. Like the you-node
and the date of birth, it becomes special by the account pointing at it:
users.nebula_lore_id, paired with the account's own id in a composite key onto
lores (id, owner_id), so it can only ever be a lore the account owns. RESTRICT,
and the API never moves the pointer once set: the Nebula cannot be deleted.

Existing accounts are backfilled: the one live lore each owns named "Nebula",
when there is exactly one. The name is read this once, to carry old data over;
from here on the pointer alone says which lore is the Nebula.

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6cc48437f26'
down_revision: Union[str, Sequence[str], None] = '44e1aea5072f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # the target of the composite key: a foreign key may only point at columns
    # that carry a unique constraint on exactly them
    op.create_unique_constraint("lores_id_owner_id_key", "lores", ["id", "owner_id"])

    op.add_column("users", sa.Column("nebula_lore_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "users_nebula_lore_fkey", "users", "lores",
        ["nebula_lore_id", "id"], ["id", "owner_id"],
        ondelete="RESTRICT",
    )

    op.execute("""
        UPDATE users u
        SET nebula_lore_id = l.id
        FROM lores l
        WHERE l.owner_id = u.id
          AND l.name = 'Nebula'
          AND l.archived_at IS NULL
          AND (SELECT count(*) FROM lores x
               WHERE x.owner_id = u.id AND x.name = 'Nebula' AND x.archived_at IS NULL) = 1
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("users_nebula_lore_fkey", "users", type_="foreignkey")
    op.drop_column("users", "nebula_lore_id")
    op.drop_constraint("lores_id_owner_id_key", "lores", type_="unique")
