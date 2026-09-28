"""users point at their date of birth, and stop storing a name

Revision ID: 44e1aea5072f
Revises: 981ccd5e5b4b
Create Date: 2026-09-28 12:31:59.000000

Written by hand: it carries data across, which --autogenerate cannot do.

The you-node is an entity and the account at the same time. Every fact about
the person lives on the entity side, stored once, and the account points at the
ones registration needs:

- self_entity_id already pointed at the entity. It becomes RESTRICT: nobody
  deletes the you-node while the account exists.
- birth_date_id is new. It points at one of the you-node's own dates, paired
  with self_entity_id in a composite key onto entity_dates (id, entity_id), so
  it can never point at someone else's date.
- users.name goes. It duplicated the entity's name, with nothing keeping the
  two in step.

Existing accounts are backfilled: when the self entity has exactly one date
labelled "born", that date becomes the date of birth. The label is read this
once, to carry old data over; from here on the pointer alone says which date is
the birth.

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '44e1aea5072f'
down_revision: Union[str, Sequence[str], None] = '981ccd5e5b4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _self_entity_fk_name() -> str:
    # created unnamed, so Postgres chose the name; read it rather than guess
    inspector = sa.inspect(op.get_bind())
    for fk in inspector.get_foreign_keys("users"):
        if fk["constrained_columns"] == ["self_entity_id"]:
            return fk["name"]
    raise RuntimeError("no foreign key on users.self_entity_id")


def upgrade() -> None:
    """Upgrade schema."""
    # the target of the composite key: a foreign key may only point at columns
    # that carry a unique constraint on exactly them
    op.create_unique_constraint("entity_dates_id_entity_id_key", "entity_dates", ["id", "entity_id"])

    op.add_column("users", sa.Column("birth_date_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "users_birth_date_fkey", "users", "entity_dates",
        ["birth_date_id", "self_entity_id"], ["id", "entity_id"],
        ondelete="RESTRICT",
    )
    # a NULL switches a composite key off, so without a self entity the key
    # above would check nothing
    op.create_check_constraint(
        "users_birth_date_needs_self", "users",
        "birth_date_id IS NULL OR self_entity_id IS NOT NULL",
    )

    op.drop_constraint(_self_entity_fk_name(), "users", type_="foreignkey")
    op.create_foreign_key(
        "users_self_entity_id_fkey", "users", "entities",
        ["self_entity_id"], ["id"],
        ondelete="RESTRICT",
    )

    op.execute("""
        UPDATE users u
        SET birth_date_id = d.id
        FROM entity_dates d
        WHERE d.entity_id = u.self_entity_id
          AND d.label = 'born'
          AND (SELECT count(*) FROM entity_dates x
               WHERE x.entity_id = u.self_entity_id AND x.label = 'born') = 1
    """)

    op.drop_column("users", "name")


def downgrade() -> None:
    """Downgrade schema."""
    # the name comes back from where it has lived since: the you-node. An
    # account with no you-node falls back to its email, since the column cannot
    # be empty.
    op.add_column("users", sa.Column("name", sa.String(), nullable=True))
    op.execute("""
        UPDATE users u
        SET name = COALESCE((SELECT e.name FROM entities e WHERE e.id = u.self_entity_id), u.email)
    """)
    op.alter_column("users", "name", nullable=False)

    op.drop_constraint("users_self_entity_id_fkey", "users", type_="foreignkey")
    op.create_foreign_key(
        "users_self_entity_id_fkey", "users", "entities",
        ["self_entity_id"], ["id"],
        ondelete="SET NULL",
    )

    op.drop_constraint("users_birth_date_needs_self", "users", type_="check")
    op.drop_constraint("users_birth_date_fkey", "users", type_="foreignkey")
    op.drop_column("users", "birth_date_id")
    op.drop_constraint("entity_dates_id_entity_id_key", "entity_dates", type_="unique")
