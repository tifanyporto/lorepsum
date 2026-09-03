from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.models import Relationship, Entity
from app.schemas import RelationshipCreate, RelationshipRead, RelationshipUpdate
from sqlalchemy.exc import IntegrityError



router = APIRouter()

@router.get("/relationships", response_model=list[RelationshipRead])
def list_relationship(db = Depends(get_db)):
    alive_ids = db.query(Entity.id).filter(Entity.archived_at.is_(None))
    return db.query(Relationship).filter(Relationship.source_id.in_(alive_ids), Relationship.target_id.in_(alive_ids)).all()
    
@router.get("/entities/{entity_id}/relationships", response_model=list[RelationshipRead])
def list_entity_relationships(entity_id: int, db = Depends(get_db)):
    alive_ids = db.query(Entity.id).filter(Entity.archived_at.is_(None))
    return db.query(Relationship).filter(Relationship.source_id == entity_id, Relationship.target_id.in_(alive_ids)).all()

@router.post("/relationships", response_model=RelationshipRead)
def create_relationship(payload: RelationshipCreate, db=Depends(get_db)):
    new_relationship = Relationship(label=payload.label, gloss=payload.gloss, target_id=payload.target_id, source_id=payload.source_id, weight=payload.weight)
    db.add(new_relationship)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    if payload.weight <= 0:
        raise HTTPException(status_code=409, detail="weight must have a value.")
    if payload.target_id == payload.source_id:
        raise HTTPException(status_code=409, detail="invalid link.")
    db.refresh(new_relationship)
    return new_relationship

@router.get("/relationships/{relationship_id}", response_model=RelationshipRead)
def get_relationship(relationship_id: int, db = Depends(get_db)):
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="relationship not found")
    return relationship

@router.delete("/relationships/{relationship_id}", status_code=204)
def delete_relationship(relationship_id: int, db=Depends(get_db)):
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="relationship not found")
    db.delete(relationship)
    db.commit()

@router.patch("/relationships/{relationship_id}", response_model=RelationshipRead)
def update_relationship(relationship_id: int, payload: RelationshipUpdate, db=Depends(get_db)):
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="relationship not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(relationship, field, value)
    db.commit()
    db.refresh(relationship)
    return relationship