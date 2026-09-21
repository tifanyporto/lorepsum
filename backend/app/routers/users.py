from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserRead, UserUpdate
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
from uuid import UUID


router = APIRouter()

@router.get("/users", response_model=list[UserRead])
def list_users(db = Depends(get_db)):
    return db.query(User).filter(User.archived_at.is_(None)).all()

@router.post("/users", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate, db = Depends(get_db)):
    new_user = User(
        name=payload.name,
        email=payload.email,
        password_hash=payload.password_hash,
        self_entity_id=payload.self_entity_id,
    )
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError as err:
        db.rollback()
        raise HTTPException(status_code=409, detail="this email or self_entity_id is already taken") from err
    db.refresh(new_user)
    return new_user

@router.get("/users/me", response_model=UserRead)
def get_current_user(db = Depends(get_db)):
        # temporary. becomes a session read once login exists (#14)
    current_user = db.query(User).filter(User.name == "dev").first()
    if current_user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return current_user


@router.get("/users/{user_id}", response_model=UserRead)
def get_user(user_id: UUID, db = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return user

@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(user_id: UUID, payload: UserUpdate, db = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    try:
        db.commit()
    except IntegrityError as err:
        db.rollback()
        raise HTTPException(status_code=409, detail="this email or self_entity_id is already taken") from err
    db.refresh(user)
    return user

@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: UUID, hard: bool = False, db = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    if hard:
        db.delete(user)
    else:
        user.archived_at = datetime.now(timezone.utc)
    db.commit()
    return


    
