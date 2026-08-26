from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.database import get_db
from app.models import Entity, EntityImage
from app.schemas import EntityImageRead, EntityImageUpdate
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
from uuid import uuid4
from pathlib import Path


ALLOWED_TYPES = ['image/jpeg', 'image/png']
MAX_SIZE = 5 * 1024 * 1024

router = APIRouter()

@router.get("/entities/{entity_id}/images", response_model=list[EntityImageRead])
def list_entity_images(entity_id: int, db = Depends(get_db)):
    return db.query(EntityImage).filter(EntityImage.entity_id == entity_id).order_by(EntityImage.created_at).all()


@router.post("/entities/{entity_id}/images", response_model=EntityImageRead)
def upload_image(entity_id: int, file: UploadFile = File(...), cover: bool = Form(False), description: str | None = Form(None),  db=Depends(get_db)):
    
    entity = db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")
    
    if file.size > MAX_SIZE:
        raise HTTPException(status_code=413, detail='payload too large')

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail='unsupported media type')

    extension = Path(file.filename).suffix
    path = f"{entity_id}-{uuid4().hex}{extension}"
    


    new_image = EntityImage(
        path=path, 
        cover=cover, 
        description=description, 
        entity_id=entity_id
        )
    db.add(new_image)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="this entity already has a cover")

    data = file.file.read()
    with open(f"media/{path}", "wb") as target:
        target.write(data)

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