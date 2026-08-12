from datetime import datetime
from pydantic import BaseModel, ConfigDict

class EntityTypeCreate(BaseModel):
    name: str

class EntityTypeRead(BaseModel):
    id: int
    name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EntityCreate(BaseModel):
    name: str
    entity_type_id: int
    description: str | None = None
    attributes: dict = {}

class EntityRead(BaseModel):
    id: int
    name: str
    entity_type_id: int
    description: str | None
    attributes: dict
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
    model_config = ConfigDict(from_attributes=True)


class RelationshipCreate(BaseModel):
    source_id: int
    target_id: int
    label: str | None = None
    weight: int | None = None

class RelationshipRead(BaseModel):
    id: int
    source_id: int
    target_id: int
    label: str | None
    weight: int | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)