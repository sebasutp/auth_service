from sqlalchemy.orm import Session
from . import db_models, models
from .auth import crypto
from typing import List, Optional

# --- User CRUD ---

def get_user(db: Session, user_id: int) -> Optional[db_models.User]:
    return db.query(db_models.User).filter(db_models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[db_models.User]:
    return db.query(db_models.User).filter(db_models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[db_models.User]:
    return db.query(db_models.User).offset(skip).limit(limit).all()


def create_user(db: Session, user: models.UserCreateInternal) -> db_models.User:
    hashed_password = crypto.get_password_hash(user.password) if user.password else None
    db_user = db_models.User(
        email=user.email,
        name=user.name,
        hashed_password=hashed_password,
        scopes=user.scopes or [], # Ensure scopes is a list
        is_active=user.is_active,
        is_google_user=user.is_google_user
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: models.UserUpdate) -> Optional[db_models.User]:
    db_user = get_user(db, user_id)
    if not db_user:
        return None

    update_data = user_update.model_dump(exclude_unset=True) # Use model_dump in Pydantic V2

    if "password" in update_data and update_data["password"]:
        hashed_password = crypto.get_password_hash(update_data["password"])
        db_user.hashed_password = hashed_password
        # If password is set/updated, maybe remove the Google user flag? Or handle logic as needed.
        # db_user.is_google_user = False
        del update_data["password"] # Don't try to set it directly below

    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> Optional[db_models.User]:
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user

# --- Cookies/Frontend Data CRUD ---

def update_user_frontend_data(db: Session, user_id: int, data: dict) -> Optional[db_models.User]:
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    db_user.frontend_data = data # Overwrite existing data
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_frontend_data(db: Session, user_id: int) -> Optional[dict]:
     db_user = get_user(db, user_id)
     if not db_user:
         return None
     return db_user.frontend_data or {} # Return empty dict if null/not set