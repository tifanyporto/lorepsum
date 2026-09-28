from datetime import datetime, timezone
from sqlalchemy import Column, Integer, SmallInteger, String, Date, DateTime, ForeignKey, ForeignKeyConstraint, CheckConstraint, UniqueConstraint, Index, Boolean, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from app.database import Base

class User(Base):
    """The account. It stores what only an account has - email, password,
    login - and no facts about the person.

    The person is the you-node, an entity like any other, and every fact about
    them lives on that side, stored once: the name on the entity, the date of
    birth among its dates. The account points at the ones registration needs.
    That is what makes the you-node special - nothing in its own row, only the
    account pointing at it.

    The Nebula works the same way: a lore like any other, special only because
    the account points at it as the place new entities arrive.
    """

    __tablename__ = "users"
    __table_args__ = (
        # the pair must match one row's (id, entity_id), so the date of birth can
        # only ever be one of your own dates - never someone else's birthday
        ForeignKeyConstraint(
            ["birth_date_id", "self_entity_id"],
            ["entity_dates.id", "entity_dates.entity_id"],
            ondelete="RESTRICT",
            name="users_birth_date_fkey",
        ),
        # a NULL switches a composite key off, so with no self entity the pair
        # above goes unchecked. A date of birth needs the self entity first.
        CheckConstraint(
            "birth_date_id IS NULL OR self_entity_id IS NOT NULL",
            name="users_birth_date_needs_self",
        ),
        # the Nebula must be one of your own lores: the pair has to match one
        # lore's (id, owner_id). The account's id is never NULL, so this one is
        # always checked.
        ForeignKeyConstraint(
            ["nebula_lore_id", "id"],
            ["lores.id", "lores.owner_id"],
            ondelete="RESTRICT",
            name="users_nebula_lore_fkey",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    # no name column: the name is the you-node's, read through self_entity_id
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String)
    # RESTRICT: nobody deletes the you-node while the account exists
    self_entity_id = Column(Integer, ForeignKey("entities.id", ondelete="RESTRICT", name="users_self_entity_id_fkey"), unique=True)
    # one of the you-node's own dates, not a copy of it: editing the date on the
    # card is editing the registration. Nullable because the account is born
    # before its entity, which needs an owner to exist.
    birth_date_id = Column(Integer)
    # where entities with no other home arrive. RESTRICT, and set once: the
    # route refuses to move it afterwards, so the Nebula can never be deleted.
    # Renaming it changes nothing here. Nullable for the same reason as above:
    # the lore needs an owner first.
    nebula_lore_id = Column(Integer)
    email_verified_at = Column(DateTime(timezone=True))
    last_login_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    archived_at = Column(DateTime(timezone=True), nullable=True)

class Lore(Base):
    __tablename__ = "lores"
    __table_args__ = (
        # two people may both have a lore called "DC Comics"; the same person
        # may not have two
        UniqueConstraint("owner_id", "name"),
        # the target of the account's Nebula: the pair is what lets the account
        # demand that its Nebula is a lore it owns
        UniqueConstraint("id", "owner_id", name="lores_id_owner_id_key"),
    )

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    archived_at = Column(DateTime(timezone=True), nullable=True)

class EntityLore(Base):
    """Which entities belong to which lore. A lore is a slice, not a container:
    the same entity can sit in several of them at once."""

    __tablename__ = "entity_lores"

    # the pair is the primary key: this row has no identity of its own, it IS
    # the statement that these two touch
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), primary_key=True)
    lore_id = Column(Integer, ForeignKey("lores.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

class EntityType(Base):
    __tablename__ = "entity_types"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    entity_type_id = Column(Integer, ForeignKey("entity_types.id"), nullable=False)
    attributes = Column(JSONB, nullable=False, default=dict)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    archived_at = Column(DateTime(timezone=True), nullable=True)
    
class Relationship(Base):
    __tablename__ = "relationships"
    __table_args__ = (
        UniqueConstraint("source_id", "target_id", "label"),
        CheckConstraint("source_id != target_id"),
        Index("ix_relationships_source", "source_id"),
        Index("ix_relationships_target", "target_id"),
        CheckConstraint("weight BETWEEN 1 AND 3")
    )

    id = Column(Integer, primary_key=True)        
    source_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    label = Column(String)      
    gloss = Column(String)   
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    weight = Column(SmallInteger)

class EntityDate(Base):
    """A date that means something to an entity, and the word for what it means.

    Same shape as Relationship: the system keeps the structure, the person names
    the meaning. Nobody has to decide in advance that a Person has a birth and a
    Movie has a release - you write the label that fits.

    An entity can hold several: Batman has a birth and a first appearance.
    """

    __tablename__ = "entity_dates"
    __table_args__ = (
        UniqueConstraint("entity_id", "date", "label"),
        # the target of the account's date of birth: a foreign key may only
        # point at columns that carry a unique constraint on exactly them.
        # `id` alone is already unique; the pair is what lets the account
        # demand that the date belongs to its own entity.
        UniqueConstraint("id", "entity_id", name="entity_dates_id_entity_id_key"),
    )

    id = Column(Integer, primary_key=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    # Date, not DateTime: a birthday is a day, not an instant. It has no hour and
    # no timezone - storing one would make the date shift when a person travels.
    date = Column(Date, nullable=False)
    # required, unlike the label on a relationship: a date with no word for what
    # it is says nothing at all
    label = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

class EntityImage(Base):
    __tablename__ = "entity_images"
    __table_args__ = (
        Index("ix_entity_images_cover", "entity_id", unique=True, postgresql_where=text("cover")),
        Index("ix_entity_images_entity", "entity_id")
    )
    id = Column(Integer, primary_key= True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    path = Column(String, nullable=False)
    cover = Column(Boolean, nullable=False, default=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))