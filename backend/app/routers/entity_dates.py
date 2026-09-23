from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from psycopg2 import errorcodes

from app.database import get_db
from app.models import Entity, EntityDate
from app.schemas import EntityDateCreate, EntityDateRead, EntityDateUpdate

router = APIRouter()


# nested collection, flat item - the same shape as entity images
@router.get("/entities/{entity_id}/dates", response_model=list[EntityDateRead])
def list_entity_dates(entity_id: int, db=Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")
    return (
        db.query(EntityDate)
        .filter(EntityDate.entity_id == entity_id)
        .order_by(EntityDate.date)
        .all()
    )


@router.post("/entities/{entity_id}/dates", response_model=EntityDateRead, status_code=201)
def create_entity_date(entity_id: int, payload: EntityDateCreate, db=Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")
    new_date = EntityDate(entity_id=entity_id, date=payload.date, label=payload.label)
    db.add(new_date)
    try:
        db.commit()
    except IntegrityError as err:
        db.rollback()
        if err.orig.pgcode == errorcodes.UNIQUE_VIOLATION:
            raise HTTPException(status_code=409, detail="this entity already has this date under this label") from err
        raise
    db.refresh(new_date)
    return new_date


@router.patch("/entity-dates/{date_id}", response_model=EntityDateRead)
def update_entity_date(date_id: int, payload: EntityDateUpdate, db=Depends(get_db)):
    entity_date = db.get(EntityDate, date_id)
    if entity_date is None:
        raise HTTPException(status_code=404, detail="date not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entity_date, field, value)
    try:
        db.commit()
    except IntegrityError as err:
        db.rollback()
        if err.orig.pgcode == errorcodes.UNIQUE_VIOLATION:
            raise HTTPException(status_code=409, detail="this entity already has this date under this label") from err
        raise
    db.refresh(entity_date)
    return entity_date


@router.delete("/entity-dates/{date_id}", status_code=204)
def delete_entity_date(date_id: int, db=Depends(get_db)):
    entity_date = db.get(EntityDate, date_id)
    if entity_date is None:
        raise HTTPException(status_code=404, detail="date not found")
    db.delete(entity_date)
    db.commit()
    return
