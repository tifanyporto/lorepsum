from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.models import Entity, User
from app.schemas import UserCreate, UserRead, UserUpdate
from sqlalchemy.exc import IntegrityError
from psycopg2 import errorcodes
from datetime import datetime, timezone
from uuid import UUID


router = APIRouter()


def refusal(err: IntegrityError, db, self_entity_id: int | None) -> HTTPException:
    """Turn the database's refusal of a user row into an answer that says why.

    Five constraints can say no, and each one means something different to
    whoever sent the request.
    """
    code = err.orig.pgcode
    constraint = err.orig.diag.constraint_name
    if code == errorcodes.UNIQUE_VIOLATION:
        return HTTPException(status_code=409, detail="this email or self_entity_id is already taken")
    if constraint == "users_birth_date_fkey":
        # the composite key is checked before the plain one, so a self entity
        # that does not exist surfaces here too - name the real problem
        if self_entity_id is not None and db.get(Entity, self_entity_id) is None:
            return HTTPException(status_code=422, detail="self_entity_id points at no entity")
        return HTTPException(status_code=422, detail="birth_date_id must be one of the self entity's own dates")
    if constraint == "users_birth_date_needs_self":
        return HTTPException(status_code=422, detail="a date of birth needs a self entity first")
    if constraint == "users_nebula_lore_fkey":
        return HTTPException(status_code=422, detail="nebula_lore_id must be one of the account's own lores")
    if code == errorcodes.FOREIGN_KEY_VIOLATION:
        return HTTPException(status_code=422, detail="self_entity_id points at no entity")
    raise err


@router.get("/users", response_model=list[UserRead])
def list_users(db = Depends(get_db)):
    return db.query(User).filter(User.archived_at.is_(None)).all()

@router.post("/users", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate, db = Depends(get_db)):
    new_user = User(
        email=payload.email,
        password_hash=payload.password_hash,
        self_entity_id=payload.self_entity_id,
        birth_date_id=payload.birth_date_id,
    )
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError as err:
        db.rollback()
        raise refusal(err, db, payload.self_entity_id) from err
    db.refresh(new_user)
    return new_user

def current_user(db = Depends(get_db)) -> User:
    """Who is asking. Every endpoint that needs an owner depends on this.

    Temporary: with no session there is nothing to read, so it is fixed on the
    dev user - by email, the one thing about a person the account itself owns.
    It becomes a session read once login exists (#14), and not one caller
    changes when it does.
    """
    user = db.query(User).filter(User.email == "dev@lorepsum.local").first()
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return user


@router.get("/users/me", response_model=UserRead)
def get_current_user(user: User = Depends(current_user)):
    return user


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
    changes = payload.model_dump(exclude_unset=True)
    # the Nebula is set once and then never moves. Pointing elsewhere, or at
    # nothing, would turn it into an ordinary lore that can be deleted - and
    # the Nebula is the home of every entity that has no other.
    if (
        "nebula_lore_id" in changes
        and user.nebula_lore_id is not None
        and changes["nebula_lore_id"] != user.nebula_lore_id
    ):
        raise HTTPException(status_code=409, detail="the Nebula is set once; it cannot be replaced or removed")
    for field, value in changes.items():
        setattr(user, field, value)
    try:
        db.commit()
    except IntegrityError as err:
        db.rollback()
        # after the rollback `user` is back to what is stored, so the entity to
        # check is the one the request asked for, when it asked for one
        raise refusal(err, db, changes.get("self_entity_id", user.self_entity_id)) from err
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


    
