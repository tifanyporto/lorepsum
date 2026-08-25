from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.models import Entity, EntityImage
from app.schemas import EntityImageCreate, EntityImageRead, EntityImageUpdate
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone

router = APIRouter()

@router.get("/entities/{entity_id}/images", response_model=list[EntityImageRead])
def list_entity_images(entity_id: int, db = Depends(get_db)):
    return db.query(EntityImage).filter(EntityImage.entity_id == entity_id).order_by(EntityImage.created_at).all()

@router.post("/entities/{entity_id}/images", response_model=EntityImageRead)
def create_image(entity_id: int, payload: EntityImageCreate, db=Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")
    new_image = EntityImage(path=payload.path, cover=payload.cover, description=payload.description, entity_id=entity_id)
    db.add(new_image)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="this entity already has a cover")
    db.refresh(new_image)
    return new_image

@router.delete("/entity-images/{image_id}", status_code=204)
def delete_images(image_id: int, db = Depends(get_db)):
    image = db.get(EntityImage, image_id)
    if image is None: 
        raise HTTPException(status_code=404, detail="image not found")
    db.delete(image)
    db.commit()
    return

@router.patch("/entity-images/{image_id}", response_model=EntityImageRead)
def update_images(image_id: int, payload: EntityImageUpdate, db = Depends(get_db)):
    image = db.get(EntityImage, image_id)
    if image is None:
        raise HTTPException(status_code=404, detail="image not found")
    if payload.cover:
        current_cover = db.query(EntityImage).filter(EntityImage.cover == True, EntityImage.entity_id == image.entity_id).first()
        if current_cover is not None:
            current_cover.cover = False
            db.flush()
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(image, field, value)
    db.commit()
    db.refresh(image)
    return image