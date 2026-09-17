from datetime import datetime, timezone
from sqlalchemy import Column, Integer, SmallInteger, String, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, Index, Boolean, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String)
    self_entity_id = Column(Integer, ForeignKey("entities.id", ondelete="SET NULL"), unique=True)
    email_verified_at = Column(DateTime(timezone=True))
    last_login_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    archived_at = Column(DateTime(timezone=True), nullable=True)


    

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