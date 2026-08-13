from fastapi import FastAPI, Depends, HTTPException
from app.database import get_db
from app.models import EntityType, Entity
from app.schemas import EntityTypeCreate, EntityTypeRead, EntityTypeUpdate, EntityRead, EntityCreate, EntityUpdate
app = FastAPI()
@app.get("/entity-types", response_model=list[EntityTypeRead])
def list_entity_types(db = Depends(get_db)):
    return db.query(EntityType).all()


@app.post("/entity-types", response_model=EntityTypeRead)
def create_entity_type(payload: EntityTypeCreate, db=Depends(get_db)):
    new_type = EntityType(name=payload.name)
    db.add(new_type)
    db.commit()
    db.refresh(new_type)
    return new_type

@app.get("/entity-types/{type_id}")
def get_entity_type(type_id: int, db = Depends(get_db)):
    entity_type = db.get(EntityType, type_id)

    if entity_type is None:
        raise HTTPException(status_code=404, detail="entity_type not found")
    
    return entity_type

@app.delete("/entity-types/{type_id}")
def delete_entity_type(type_id: int, db = Depends(get_db)):
    entity_type = db.get(EntityType, type_id)
    if entity_type is None:
        raise HTTPException(status_code=404, detail="entity_type not found")
    db.delete(entity_type)
    db.commit()
    return entity_type

@app.patch("/entity-types/{type_id}", response_model=EntityTypeRead)
def update_entity_type(type_id: int, payload: EntityTypeUpdate, db = Depends(get_db)):
    entity_type = db.get(EntityType, type_id)
    if entity_type is None:
        raise HTTPException(status_code=404, detail="entity_type not found")
    entity_type.name = payload.name
    db.commit()
    db.refresh(entity_type)
    return entity_type

# -----------------------------------------

@app.get("/entities",response_model=list[EntityRead])
def list_entity(db = Depends(get_db)):
    return db.query(Entity).all()

@app.post("/entities", response_model=EntityRead)
def create_entity(payload: EntityCreate, db=Depends(get_db)):
    new_entity = Entity(name=payload.name, entity_type_id=payload.entity_type_id, description=payload.description, attributes=payload.attributes)
    db.add(new_entity)
    db.commit()
    db.refresh(new_entity)
    return new_entity

@app.get("/entities/{entity_id}", response_model=EntityRead)
def get_entity(entity_id: int, db = Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")
    return entity


@app.delete("/entities/{entity_id}")
def delete_entity( entity_id: int, db=Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")
    db.delete(entity)
    db.commit()
    return entity

@app.patch("/entities/{entity_id}", response_model=EntityRead)
def update_entity(entity_id: int, payload: EntityUpdate, db = Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entity, field, value)
    db.commit()
    db.refresh(entity)
    return entity