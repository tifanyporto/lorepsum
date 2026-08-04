from datetime import datetime
from sqlalchemy import Column, Integer, SmallInteger, String, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import JSONB
from app.database import Base

class EntityType(Base):
    __tablename__ = "entity_type"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class Entity(Base):
    __tablename__ = "entity"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    entity_type_id = Column(Integer, ForeignKey("entity_type.id"), nullable=False)
    attributes = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    archived_at = Column(DateTime, nullable=True)

class Relationship(Base):
    __tablename__ = "relationship"
    __table_args__ = (
        UniqueConstraint("source_id", "target_id", "label"),
        CheckConstraint("source_id != target_id"),
        Index("ix_relationship_source", "source_id"),
        Index("ix_relationship_target", "target_id")
    )

    id = Column(Integer, primary_key=True)        
    source_id = Column(Integer, ForeignKey("entity.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(Integer, ForeignKey("entity.id", ondelete="CASCADE"), nullable=False)
    label = Column(String)         
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    weight = Column(SmallInteger, CheckConstraint("weight BETWEEN 1 AND 3"))