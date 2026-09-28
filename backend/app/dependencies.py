from fastapi import Depends, HTTPException
from app.database import get_db
from app.models import User


def current_user(db = Depends(get_db)) -> User:
    """Who is asking. Every endpoint that needs an owner depends on this.

    It lives apart from the routers because it belongs to none of them: users,
    entities and lores all ask for it, and a router importing another router
    to reach it would tie routes together that have nothing to do with each
    other.

    Temporary: with no session there is nothing to read, so it is fixed on the
    dev user - by email, the one thing about a person the account itself owns.
    It becomes a session read once login exists (#14), and not one caller
    changes when it does.
    """
    user = db.query(User).filter(User.email == "dev@lorepsum.local").first()
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return user
