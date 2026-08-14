from fastapi import FastAPI, Depends, HTTPException
from app.database import get_db
from app.models import EntityType, Entity, Relationship
from app.schemas import EntityTypeCreate, EntityTypeRead, EntityTypeUpdate, EntityRead, EntityCreate, EntityUpdate, RelationshipCreate, RelationshipRead, RelationshipUpdate
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone


app = FastAPI()
@app.get("/entity-types", response_model=list[EntityTypeRead])
def list_entity_types(db = Depends(get_db)):
    return db.query(EntityType).all()


@app.post("/entity-types", response_model=EntityTypeRead)
def create_entity_type(payload: EntityTypeCreate, db=Depends(get_db)):
    new_type = EntityType(name=payload.name)
    db.add(new_type)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="this name already exists.")
    db.refresh(new_type)
    return new_type

@app.get("/entity-types/{type_id}", response_model=EntityTypeRead)
def get_entity_type(type_id: int, db = Depends(get_db)):
    entity_type = db.get(EntityType, type_id)

    if entity_type is None:
        raise HTTPException(status_code=404, detail="entity_type not found")
    
    return entity_type

@app.delete("/entity-types/{type_id}", status_code=204)
def delete_entity_type(type_id: int, db = Depends(get_db)):
    entity_type = db.get(EntityType, type_id)
    if entity_type is None:
        raise HTTPException(status_code=404, detail="entity_type not found")
    db.delete(entity_type)
    db.commit()
    return

@app.patch("/entity-types/{type_id}", response_model=EntityTypeRead)
def update_entity_type(type_id: int, payload: EntityTypeUpdate, db = Depends(get_db)):
    entity_type = db.get(EntityType, type_id)
    if entity_type is None:
        raise HTTPException(status_code=404, detail="entity_type not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entity_type, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="this name already exists.")
    db.refresh(entity_type)
    return entity_type

# -----------------------------------------

@app.get("/entities",response_model=list[EntityRead])
def list_entity(db = Depends(get_db)):
    return db.query(Entity).filter(Entity.archived_at.is_(None)).all()

@app.post("/entities", response_model=EntityRead)
def create_entity(payload: EntityCreate, db=Depends(get_db)):
    new_entity = Entity(name=payload.name, entity_type_id=payload.entity_type_id, description=payload.description, attributes=payload.attributes)
    db.add(new_entity)
    try:
        db.commit()
    except IntegrityError:
        if payload.entity_type_id is None:
            db.rollback()
            raise HTTPException(status_code=500, detail="invalid entity_type_id")
        if payload.name is None:
            b.rollback()
            raise HTTPException(status_code=500, detail="invalid name")
    db.refresh(new_entity)
    return new_entity

@app.get("/entities/{entity_id}", response_model=EntityRead)
def get_entity(entity_id: int, db = Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")
    return entity


@app.delete("/entities/{entity_id}", status_code=204)
def delete_entity( entity_id: int, hard: bool = False, db=Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")
    if hard:
        db.delete(entity)
    else:
        entity.archived_at = datetime.now(timezone.utc)
    db.commit()
    return

@app.patch("/entities/{entity_id}", response_model=EntityRead)
def update_entity(entity_id: int, payload: EntityUpdate, db = Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entity, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=500, detail="invalid entity_type_id")
    db.refresh(entity)
    return entity
# --------------------------------------------------------------------------------

@app.get("/relationships", response_model=list[RelationshipRead])
def list_relationship(db = Depends(get_db)):
    return db.query(Relationship).all()

@app.post("/relationships", response_model=RelationshipRead)
def create_relationship(payload: RelationshipCreate, db=Depends(get_db)):
    new_relationship = Relationship(label=payload.label, target_id=payload.target_id, source_id=payload.source_id, weight=payload.weight)
    db.add(new_relationship)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="invalid link.")
    db.refresh(new_relationship)
    return new_relationship

@app.get("/relationships/{relationship_id}", response_model=RelationshipRead)
def get_relationship(relationship_id: int, db = Depends(get_db)):
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="relationship not found")
    return relationship

@app.delete("/relationships/{relationship_id}", status_code=204)
def delete_relationship(relationship_id: int, db=Depends(get_db)):
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="relationship not found")
    db.delete(relationship)
    db.commit()

@app.patch("/relationships/{relationship_id}", response_model=RelationshipRead)
def update_relationship(relationship_id: int, payload: RelationshipUpdate, db=Depends(get_db)):
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="relationship not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(relationship, field, value)
    db.commit()
    db.refresh(relationship)
    return relationship