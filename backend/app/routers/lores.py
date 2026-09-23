from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from psycopg2 import errorcodes
from datetime import datetime, timezone

from app.database import get_db
from app.models import Lore, Entity, EntityLore, User
from app.routers.users import current_user
from app.schemas import (
    LoreCreate,
    LoreRead,
    LoreUpdate,
    LoreEntityCreate,
    EntityRead,
)

router = APIRouter()


def with_count(db, lore: Lore) -> Lore:
    """The lore, carrying how many entities are in it.

    entity_count is not stored anywhere. A lore is a slice, so its size is a
    fact about the join table; keeping a copy on the row would be a second
    place for the same truth, and two places drift.

    It is attached to the object per request. SQLAlchemy ignores attributes
    that are not columns, and Pydantic reads it because the schema declares it.
    """
    lore.entity_count = db.query(EntityLore).filter(EntityLore.lore_id == lore.id).count()
    return lore


@router.get("/lores", response_model=list[LoreRead])
def list_lores(user: User = Depends(current_user), db=Depends(get_db)):
    # one query for the lores and their counts, instead of one per lore.
    # outerjoin keeps a lore with no entities in the result, with a count of 0
    rows = (
        db.query(Lore, func.count(EntityLore.entity_id))
        .outerjoin(EntityLore, EntityLore.lore_id == Lore.id)
        .filter(Lore.owner_id == user.id, Lore.archived_at.is_(None))
        .group_by(Lore.id)
        .order_by(Lore.created_at)
        .all()
    )
    # the count comes from the query above, so nothing is counted twice
    for lore, total in rows:
        lore.entity_count = total
    return [lore for lore, _ in rows]


@router.post("/lores", response_model=LoreRead, status_code=201)
def create_lore(payload: LoreCreate, user: User = Depends(current_user), db=Depends(get_db)):
    new_lore = Lore(name=payload.name, description=payload.description, owner_id=user.id)
    db.add(new_lore)
    try:
        db.commit()
    except IntegrityError as err:
        db.rollback()
        raise HTTPException(status_code=409, detail="you already have a lore with this name") from err
    db.refresh(new_lore)
    return with_count(db, new_lore)


@router.get("/lores/{lore_id}", response_model=LoreRead)
def get_lore(lore_id: int, user: User = Depends(current_user), db=Depends(get_db)):
    lore = db.get(Lore, lore_id)
    if lore is None or lore.owner_id != user.id:
        raise HTTPException(status_code=404, detail="lore not found")
    return with_count(db, lore)


@router.patch("/lores/{lore_id}", response_model=LoreRead)
def update_lore(lore_id: int, payload: LoreUpdate, user: User = Depends(current_user), db=Depends(get_db)):
    lore = db.get(Lore, lore_id)
    if lore is None or lore.owner_id != user.id:
        raise HTTPException(status_code=404, detail="lore not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lore, field, value)
    try:
        db.commit()
    except IntegrityError as err:
        db.rollback()
        raise HTTPException(status_code=409, detail="you already have a lore with this name") from err
    db.refresh(lore)
    return with_count(db, lore)


@router.delete("/lores/{lore_id}", status_code=204)
def delete_lore(lore_id: int, hard: bool = False, user: User = Depends(current_user), db=Depends(get_db)):
    lore = db.get(Lore, lore_id)
    if lore is None or lore.owner_id != user.id:
        raise HTTPException(status_code=404, detail="lore not found")
    if hard:
        # the memberships go with it through ON DELETE CASCADE; the entities
        # themselves survive, because a slice is not a container
        db.delete(lore)
    else:
        lore.archived_at = datetime.now(timezone.utc)
    db.commit()
    return


# ---------------------------------------------------------------- membership

@router.get("/lores/{lore_id}/entities", response_model=list[EntityRead])
def list_lore_entities(lore_id: int, user: User = Depends(current_user), db=Depends(get_db)):
    lore = db.get(Lore, lore_id)
    if lore is None or lore.owner_id != user.id:
        raise HTTPException(status_code=404, detail="lore not found")
    return (
        db.query(Entity)
        .join(EntityLore, EntityLore.entity_id == Entity.id)
        .filter(EntityLore.lore_id == lore_id, Entity.archived_at.is_(None))
        .all()
    )


@router.post("/lores/{lore_id}/entities", status_code=204)
def add_entity_to_lore(lore_id: int, payload: LoreEntityCreate, user: User = Depends(current_user), db=Depends(get_db)):
    lore = db.get(Lore, lore_id)
    if lore is None or lore.owner_id != user.id:
        raise HTTPException(status_code=404, detail="lore not found")
    entity = db.get(Entity, payload.entity_id)
    if entity is None or entity.owner_id != user.id:
        raise HTTPException(status_code=422, detail="entity_id does not exist")
    db.add(EntityLore(entity_id=payload.entity_id, lore_id=lore_id))
    try:
        db.commit()
    except IntegrityError as err:
        db.rollback()
        if err.orig.pgcode == errorcodes.UNIQUE_VIOLATION:
            raise HTTPException(status_code=409, detail="this entity is already in this lore") from err
        raise
    return


# no flat route for a membership: it has no id of its own. The pair is the key,
# so the pair is the address
@router.delete("/lores/{lore_id}/entities/{entity_id}", status_code=204)
def remove_entity_from_lore(lore_id: int, entity_id: int, user: User = Depends(current_user), db=Depends(get_db)):
    lore = db.get(Lore, lore_id)
    if lore is None or lore.owner_id != user.id:
        raise HTTPException(status_code=404, detail="lore not found")
    link = db.get(EntityLore, (entity_id, lore_id))
    if link is None:
        raise HTTPException(status_code=404, detail="this entity is not in this lore")
    db.delete(link)
    db.commit()
    return
