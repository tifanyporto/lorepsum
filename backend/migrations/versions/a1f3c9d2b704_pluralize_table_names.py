"""pluralize table names

Revision ID: a1f3c9d2b704
Revises: 6c2c163a7084
Create Date: 2026-09-03 15:02:11.000000

Escrita à mão: o --autogenerate não enxerga renomeação. Ele veria a tabela
antiga sumir e uma nova aparecer, e escreveria drop_table + create_table —
o que apagaria os dados. rename_table preserva tudo, e o Postgres carrega
as chaves estrangeiras junto (elas apontam pro identificador interno da
tabela, não pro nome).

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

# os índices declarados no models.py levam o nome da tabela; renomear a
# tabela não renomeia o índice, então isso é feito à parte
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
