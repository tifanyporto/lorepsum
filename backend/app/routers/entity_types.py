from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.models import EntityType
from app.schemas import EntityTypeCreate, EntityTypeRead, EntityTypeUpdate
from sqlalchemy.exc import IntegrityError


router = APIRouter()

@router.get("/entity-types", response_model=list[EntityTypeRead])
def list_entity_types(db = Depends(get_db)):
    return db.query(EntityType).all()


@router.post("/entity-types", response_model=EntityTypeRead)
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

@router.get("/entity-types/{type_id}", response_model=EntityTypeRead)
def get_entity_type(type_id: int, db = Depends(get_db)):
    entity_type = db.get(EntityType, type_id)

    if entity_type is None:
        raise HTTPException(status_code=404, detail="entity_type not found")
    
    return entity_type

@router.delete("/entity-types/{type_id}", status_code=204)
def delete_entity_type(type_id: int, db = Depends(get_db)):
    entity_type = db.get(EntityType, type_id)
    if entity_type is None:
        raise HTTPException(status_code=404, detail="entity_type not found")
    db.delete(entity_type)
    db.commit()
    return

@router.patch("/entity-types/{type_id}", response_model=EntityTypeRead)
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