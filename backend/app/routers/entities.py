from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.models import Entity, EntityImage
from app.schemas import EntityRead, EntityCreate, EntityUpdate
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
from pathlib import Path


router = APIRouter()

@router.get("/entities",response_model=list[EntityRead])
def list_entity(db = Depends(get_db)):
    return db.query(Entity).filter(Entity.archived_at.is_(None)).all()

@router.post("/entities", response_model=EntityRead)
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
            db.rollback()
            raise HTTPException(status_code=500, detail="invalid name")
    db.refresh(new_entity)
    return new_entity

@router.get("/entities/{entity_id}", response_model=EntityRead)
def get_entity(entity_id: int, db = Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")
    return entity


@router.delete("/entities/{entity_id}", status_code=204)
def delete_entity( entity_id: int, hard: bool = False, db=Depends(get_db)):
    entity = db.get(Entity, entity_id)
    paths = []
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")
    if hard:
        images = db.query(EntityImage).filter(EntityImage.entity_id == entity_id).all()
        paths = [i.path for i in images]
        db.delete(entity)
    else:
        entity.archived_at = datetime.now(timezone.utc)
    db.commit()
    for path in paths:
        Path(f"media/{path}").unlink(missing_ok=True)
    return

@router.patch("/entities/{entity_id}", response_model=EntityRead)
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