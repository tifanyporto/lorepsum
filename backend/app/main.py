from fastapi import FastAPI, Depends, HTTPException
from app.database import get_db
from app.models import EntityType
from app.schemas import EntityTypeCreate, EntityTypeRead

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
    db.delete(entity_type)
    db.commit()
    if entity_type is None:
        raise HTTPException(status_code=404, detail="entity_type not found")
    return entity_type

@app.put("/entity-types/{type_id}", response_model=EntityTypeRead)
def update_entity_type(type_id: int, payload: EntityTypeCreate, db = Depends(get_db)):
    entity_type = db.get(EntityType, type_id)
    if entity_type is None:
        raise HTTPException(status_code=404, detail="entity_type not found")
    entity_type.name = payload.name
    db.commit()
    db.refresh(entity_type)
    return entity_type