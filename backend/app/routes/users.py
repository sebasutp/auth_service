from fastapi import APIRouter, Depends, HTTPException, status, Security
from sqlalchemy.orm import Session
from typing import List

from .. import crud, models, db_models
from ..database import get_db
from ..auth import auth_handler

router = APIRouter()

# --- User Management (Admin Only) ---

# Use the specific admin dependency here
@router.post("", response_model=models.UserPublic, status_code=status.HTTP_201_CREATED)
def create_new_user(
    user: models.UserCreate, # Use the one requiring password
    db: Session = Depends(get_db),
    admin_user: db_models.User = Depends(auth_handler.require_admin_scope) # Check admin scope
):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Convert UserCreate to UserCreateInternal for the CRUD function
    user_internal = models.UserCreateInternal(
        email=user.email,
        name=user.name,
        password=user.password, # Pass the password
        scopes=user.scopes or ["default"], # Assign default scopes if needed
        is_active=user.is_active,
        is_google_user=False # Manually created user
    )
    return crud.create_user(db=db, user=user_internal)


@router.get("", response_model=List[models.UserPublic])
def read_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin_user: db_models.User = Depends(auth_handler.require_admin_scope) # Check admin scope
):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users


@router.get("/{user_id}", response_model=models.UserPublic)
def read_single_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: db_models.User = Depends(auth_handler.require_admin_scope) # Check admin scope
):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.put("/{user_id}", response_model=models.UserPublic)
def update_existing_user(
    user_id: int,
    user_update: models.UserUpdate,
    db: Session = Depends(get_db),
    admin_user: db_models.User = Depends(auth_handler.require_admin_scope) # Check admin scope
):
    db_user = crud.update_user(db=db, user_id=user_id, user_update=user_update)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    # Prevent admin from accidentally removing their own admin scope? Optional check.
    # if admin_user.id == user_id and 'admin' not in (user_update.scopes or db_user.scopes):
    #     raise HTTPException(status_code=403, detail="Cannot remove own admin scope")
    return db_user


@router.delete("/{user_id}", response_model=models.UserPublic)
def delete_existing_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: db_models.User = Depends(auth_handler.require_admin_scope) # Check admin scope
):
    # Prevent admin from deleting themselves?
    if admin_user.id == user_id:
         raise HTTPException(status_code=403, detail="Admin users cannot delete themselves.")

    db_user = crud.delete_user(db=db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user