from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.models import Entity, EntityImage, User
from app.routers.users import current_user
from app.schemas import EntityRead, EntityCreate, EntityUpdate
from sqlalchemy.exc import IntegrityError
from psycopg2 import errorcodes
from datetime import datetime, timezone
from pathlib import Path


router = APIRouter()

@router.get("/entities",response_model=list[EntityRead])
def list_entity(db = Depends(get_db)):
    return db.query(Entity).filter(Entity.archived_at.is_(None)).all()

@router.post("/entities", response_model=EntityRead)
def create_entity(payload: EntityCreate, user: User = Depends(current_user), db=Depends(get_db)):
    # the owner is whoever is asking, never a field in the body - the same rule
    # as lores: letting the client name the owner would let anyone create an
    # entity inside someone else's account
    new_entity = Entity(
        name=payload.name,
        entity_type_id=payload.entity_type_id,
        description=payload.description,
        attributes=payload.attributes,
        owner_id=user.id,
    )
    db.add(new_entity)
    try:
        db.commit()
    except IntegrityError as err:
        db.rollback()
        # the type is the only reference the body carries. Any other refusal is
        # not the client's to fix, so it is not dressed up as a bad type.
        if err.orig.pgcode == errorcodes.FOREIGN_KEY_VIOLATION:
            raise HTTPException(status_code=422, detail="invalid entity_type_id") from err
        raise
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
    # nobody deletes a you-node while its account exists. The database already
    # refuses a hard delete (users.self_entity_id is RESTRICT), but archiving is
    # only an UPDATE and slips past it - so both are refused here, up front.
    if db.query(User).filter(User.self_entity_id == entity_id).first() is not None:
        raise HTTPException(status_code=409, detail="this entity is an account's you-node; it cannot be deleted while the account exists")
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
    except IntegrityError as err:
        db.rollback()
        raise HTTPException(status_code=500, detail="invalid entity_type_id") from err
    db.refresh(entity)
    return entity