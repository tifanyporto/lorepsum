from datetime import date as date_type, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class UserCreate(BaseModel):
    name: str
    email: str
    # no auth yet, so this is nullable and the `dev` user can exist without a
    # password. Once sign-up exists it becomes `password: str` and the hash is
    # computed in here, never received ready-made from outside.
    password_hash: str | None = None
    self_entity_id: int | None = None


# the hash is absent on purpose: this is what goes out over the wire
class UserRead(BaseModel):
    id: UUID
    name: str
    email: str
    self_entity_id: int | None
    email_verified_at: datetime | None
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    password_hash: str | None = None
    self_entity_id: int | None = None

class LoreCreate(BaseModel):
    # owner_id is absent on purpose: who owns a lore comes from who is asking,
    # never from the request body. Letting the client name the owner would let
    # anyone create a lore inside someone else's account.
    name: str
    description: str | None = None

class LoreRead(BaseModel):
    id: int
    name: str
    description: str | None
    # not a column: counted per request, because a lore is a slice and the size
    # of a slice is a question about the join table, not a property of the row
    entity_count: int
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
    model_config = ConfigDict(from_attributes=True)

class LoreUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class LoreEntityCreate(BaseModel):
    entity_id: int

class EntityTypeCreate(BaseModel):
    name: str

class EntityTypeRead(BaseModel):
    id: int
    name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EntityTypeUpdate(BaseModel):
    name: str | None = None

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

class EntityUpdate(BaseModel):
    name: str | None = None
    entity_type_id: int | None = None
    description: str | None = None
    attributes: dict | None = None

class EntityDateCreate(BaseModel):
    # date_type is datetime.date renamed on import. A field called `date` can be
    # annotated `date` when it has no default - but `date: date | None = None`
    # cannot: Python assigns the default first, so by the time it reads the
    # annotation the name already means None. Renamed here too, for consistency.
    date: date_type
    label: str

class EntityDateRead(BaseModel):
    id: int
    entity_id: int
    date: date_type
    label: str
    model_config = ConfigDict(from_attributes=True)

class EntityDateUpdate(BaseModel):
    date: date_type | None = None
    label: str | None = None

class EntityImageRead(BaseModel):
    id: int
    entity_id: int
    path: str
    cover: bool
    description: str | None 
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EntityImageUpdate(BaseModel):
    path: str | None = None
    cover: bool | None = None
    description: str | None = None

class RelationshipCreate(BaseModel):
    source_id: int
    target_id: int
    label: str | None = None
    gloss: str | None = None
    weight: int | None = Field(default=None, ge=1, le=3)

class RelationshipRead(BaseModel):
    id: int
    source_id: int
    target_id: int
    label: str | None
    weight: int | None
    gloss: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RelationshipUpdate(BaseModel):
    source_id: int | None = None
    target_id: int | None = None
    label: str | None = None
    gloss: str | None = None
    weight: int | None = Field(default=None, ge=1, le=3)