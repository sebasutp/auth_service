from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from .. import crud, models, db_models
from ..database import get_db
from ..auth import auth_handler

router = APIRouter()

@router.post("/", status_code=status.HTTP_204_NO_CONTENT)
async def save_frontend_data(
    payload: models.CookiesData,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(auth_handler.get_current_active_user) # Require logged-in user
):
    """ Saves arbitrary JSON data associated with the logged-in user """
    updated_user = crud.update_user_frontend_data(db, user_id=current_user.id, data=payload.data)
    if not updated_user:
        # This shouldn't happen if get_current_active_user works
        raise HTTPException(status_code=404, detail="User not found while saving data")
    return None # Return 204 No Content


@router.get("/", response_model=models.CookiesData)
async def get_frontend_data(
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(auth_handler.get_current_active_user) # Require logged-in user
):
    """ Retrieves the stored JSON data for the logged-in user """
    data = crud.get_user_frontend_data(db, user_id=current_user.id)
    return models.CookiesData(data=data or {}) # Return stored data or empty dict