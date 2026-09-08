from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class UserCreate(BaseModel):
    name: str
    email: str
    # sem autenticação ainda: aceita nulo para que o usuário `dev` possa nascer
    # sem senha. Quando o cadastro existir, isto vira `password: str` e o hash
    # passa a ser feito aqui dentro, nunca recebido pronto de fora.
    password_hash: str | None = None
    self_entity_id: int | None = None

# o hash NÃO aparece aqui: schema de leitura é o que sai pela rede, e o hash
# é justamente a única coisa que nunca deve sair
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