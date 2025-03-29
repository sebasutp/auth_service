from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
import httpx

from ..config import settings
from .. import models, crud, db_models
from ..database import get_db
from sqlalchemy.orm import Session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False) # Relative URL based on api.py prefix

# --- JWT Handling ---

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    # Ensure 'sub' (subject) and 'scopes' are present
    if "sub" not in to_encode:
        raise ValueError("Subject ('sub') missing from token data")
    if "scopes" not in to_encode:
         # Provide default empty list if scopes missing
        to_encode["scopes"] = []

    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def decode_access_token(token: str, db: Session) -> models.TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        scopes: List[str] = payload.get("scopes", []) # Ensure scopes is a list
        if user_id is None:
            raise credentials_exception
        token_data = models.TokenData(user_id=int(user_id), scopes=scopes)
    except JWTError:
        raise credentials_exception
    except ValueError: # Handle case where user_id is not an int
         raise credentials_exception

    # Optional: Check if user still exists and is active (more secure)
    user = crud.get_user(db, user_id=token_data.user_id)
    if user is None or not user.is_active:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User inactive or not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Important: Update token scopes with current user scopes from DB
    # This ensures permission changes take effect immediately upon next token validation
    token_data.scopes = user.scopes
    return token_data


# --- Google OAuth ---

async def get_google_auth_url(state: Optional[str] = None) -> str:
    if not settings.google_client_id or not settings.google_redirect_uri:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth not configured")

    params = {
        "response_type": "code",
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "scope": "openid email profile", # Request basic profile info
        "access_type": "offline", # Optional: If you need refresh tokens
        "prompt": "select_account", # Force account selection
    }
    if state:
        params["state"] = state

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{httpx.QueryParams(params)}"
    return auth_url

async def exchange_code_for_token(code: str) -> Dict[str, Any]:
    if not settings.google_client_id or not settings.google_client_secret or not settings.google_redirect_uri:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth not configured")

    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=payload)
        response.raise_for_status() # Raise exception for non-2xx responses
        return response.json()

async def get_google_user_info(access_token: str) -> Dict[str, Any]:
    user_info_url = "https://www.googleapis.com/oauth2/v1/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient() as client:
        response = await client.get(user_info_url, headers=headers)
        response.raise_for_status()
        return response.json()

# --- Dependency for getting current user ---

async def get_current_user(
    security_scopes: SecurityScopes, # FastAPI handles checking WWW-Authenticate header scopes
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> db_models.User:
    if token is None:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": f'Bearer scope="{security_scopes.scope_str}"'}, # Include required scopes in challenge
        )

    token_data = decode_access_token(token, db) # This already checks if user exists/active

    user = crud.get_user(db, user_id=token_data.user_id)
    if user is None: # Should be caught by decode_access_token, but double-check
        raise HTTPException(status_code=404, detail="User not found")

    # Check Scopes
    if security_scopes.scopes: # If specific scopes are required by the endpoint
        # Use the scopes from the token data (which were refreshed from DB)
        token_scopes = set(token_data.scopes)
        for scope in security_scopes.scopes:
            if scope not in token_scopes:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Not enough permissions. Requires scope: {scope}",
                    headers={"WWW-Authenticate": f'Bearer scope="{security_scopes.scope_str}"'},
                )

    return user

async def get_current_active_user(
    current_user: db_models.User = Depends(get_current_user) # Use the base dependency
) -> db_models.User:
    # This is mostly redundant now as get_current_user checks activity via decode_access_token
    # But kept for potential explicit active checks if needed later
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Dependency to check for Admin scope specifically
async def require_admin_scope(
    current_user: db_models.User = Depends(get_current_user) # Base dependency already handles auth
) -> db_models.User:
    if "admin" not in current_user.scopes:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required.",
        )
    return current_user