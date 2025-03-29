from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
import datetime

# --- Token ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: int | None = None
    scopes: List[str] = []

# --- User ---
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    scopes: List[str] = []
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(min_length=8) # Require password for manual creation

class UserCreateInternal(UserBase): # For Google signup where password isn't set initially
    password: Optional[str] = None
    is_google_user: bool = False

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    scopes: Optional[List[str]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8) # Allow password update/set

class UserInDBBase(UserBase):
    id: int
    is_google_user: bool
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True # Pydantic V2 (formerly orm_mode)

class UserPublic(UserInDBBase): # Data safe to return to anyone (e.g., admins listing users)
    pass

class UserPrivate(UserInDBBase): # Data safe to return to the user themselves
    # If you had sensitive fields only the user should see, add them here
    pass

# --- Cookies ---
class CookiesData(BaseModel):
    data: Dict[str, Any]