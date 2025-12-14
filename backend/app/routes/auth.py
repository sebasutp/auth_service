from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Form, Query, Response
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import urllib.parse
import httpx
import json  # Import the json module

from .. import crud, models
from ..database import get_db
from ..auth import auth_handler, crypto
from ..config import settings

router = APIRouter()

@router.post("/login", response_model=models.Token)
async def login_for_access_token(
    response: Response, # Inject Response object
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = crud.get_user_by_email(db, email=form_data.username) # Use email as username
    if not user or not user.hashed_password or not crypto.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
         raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = auth_handler.create_access_token(
        data={"sub": str(user.id), "scopes": user.scopes}, # Ensure sub is string, pass scopes
        expires_delta=access_token_expires,
    )

    # Set token in an HttpOnly cookie (more secure for web apps)
    # response.set_cookie(
    #     key="access_token",
    #     value=f"Bearer {access_token}",
    #     httponly=True,
    #     max_age=settings.access_token_expire_minutes * 60,
    #     expires=settings.access_token_expire_minutes * 60,
    #     samesite="lax", # Or "strict"
    #     secure=False # Set to True if using HTTPS
    # )

    # Return token in response body as well for SPA flexibility
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/login/google")
async def login_via_google(
    redirect_uri: Optional[str] = Query(None), # Client app's desired redirect URI
    client_scope: Optional[str] = Query(None) # Scope(s) requested by the client app
    ):
    # We store the client's desired redirect_uri and scope in the state parameter
    # Use a secure method (e.g., encode/encrypt) if needed, here basic URL encoding
    state_data = {}
    if redirect_uri:
        state_data["ru"] = redirect_uri
    if client_scope:
        state_data["rs"] = client_scope

    state_param = urllib.parse.quote(json.dumps(state_data)) if state_data else None # Use json.dumps

    google_auth_url = await auth_handler.get_google_auth_url(state=state_param)
    return RedirectResponse(google_auth_url)


@router.get("/google/callback")
async def auth_google_callback(
    code: str = Query(...),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db)
    ):
    try:
        token_data = await auth_handler.exchange_code_for_token(code)
        user_info = await auth_handler.get_google_user_info(token_data['access_token'])

        email = user_info.get("email")
        user_name = user_info.get("name")
        print(user_info)
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")

        user = crud.get_user_by_email(db, email=email)

        # Define default scopes for new Google users (can be empty)
        default_scopes = ["read:profile"] # Example scope

        if not user:
            # Create new user from Google info
            user_create = models.UserCreateInternal(
                email=email,
                name=user_name,
                scopes=default_scopes, # Assign default scopes
                is_google_user=True,
                is_active=True # Assume active on first login
                # Password remains null
            )
            user = crud.create_user(db, user_create)
        elif not user.is_active:
             raise HTTPException(status_code=400, detail="User account is inactive")
        # else: User exists, potentially update details if needed

        # --- Handle Redirect and Scope Check ---
        client_redirect_uri = settings.frontend_url # Default redirect to our frontend
        requested_scope = None
        login_status = "success" # Assume success initially

        if state:
            try:
                # Attempt to parse state. Be careful with eval if not tightly controlled.
                # A safer approach would be JSON encoding/decoding or a custom format.
                state_data = json.loads(urllib.parse.unquote(state)) # Use json.loads
                client_redirect_uri = state_data.get("ru", client_redirect_uri)
                requested_scope = state_data.get("rs")
            except json.JSONDecodeError:
                # Log error, invalid state format
                print(f"Warning: Could not parse state parameter as JSON: {state}")
                pass # Fallback to default redirect
            except Exception as e:
                print(f"Error parsing state: {e}")
                pass

        # --- Security: Validate Redirect URI ---
        # Normalize for comparison? Strict exact match is safer.
        # Ensure allowed_origins is populated in production.
        if settings.allowed_origins:
            # Check if client_redirect_uri starts with any allowed origin
            if not any(client_redirect_uri.startswith(origin) for origin in settings.allowed_origins):
                 raise HTTPException(status_code=400, detail="Invalid redirect_uri. Domain not in allowlist.")
        else:
            # Fallback warning if not configured (or fail open/close based on policy)
            # For now, if empty, we might allow frontend_url ONLY, or warn.
            # To be safe, if list is empty, ONLY allow frontend_url
            if client_redirect_uri != settings.frontend_url:
                 raise HTTPException(status_code=400, detail="Redirect URI validation failed (Allowlist empty).")

        # Check if user has the scope requested by the client app
        if requested_scope and requested_scope not in user.scopes:
            login_status = "access_denied"
            # Do *not* issue a token for the denied scope, but still redirect
            # We will redirect without a token, but with a status message
            redirect_url = f"{client_redirect_uri}?login_status={login_status}&reason=scope_missing&required_scope={requested_scope}"
            return RedirectResponse(redirect_url)


        # Generate JWT for the user
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = auth_handler.create_access_token(
            data={"sub": str(user.id), "scopes": user.scopes},
            expires_delta=access_token_expires,
        )

        # Redirect back to the *original client app* (or our frontend) with the token
        # Using URL fragment (#) is generally preferred for SPAs
        redirect_url = f"{client_redirect_uri}#access_token={access_token}&token_type=bearer&login_status={login_status}"

        return RedirectResponse(redirect_url)

    except httpx.HTTPStatusError as e:
        # Log the error details from httpx
        print(f"HTTP Error during Google OAuth: {e.response.status_code} - {e.response.text}")
        try:
            error_data = e.response.json()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed Google authentication: {error_data}")
        except json.JSONDecodeError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed Google authentication: {e.response.text}")
    except Exception as e:
        print(f"Error during Google callback: {e}") # Log unexpected errors
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during Google sign-in.")

@router.get("/me", response_model=models.UserPublic)
async def read_users_me(current_user: models.UserPublic = Depends(auth_handler.get_current_active_user)):
    """
    Get current logged-in user's public details.
    """
    return current_user
