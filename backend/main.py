from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn, contextlib
import asyncio  # Import asyncio

from app.api import api_router
from app.database import engine, Base, SessionLocal, get_db
from app.db_models import User  # Import User model
from app import crud, models, config
from app.auth import crypto
from app.config import settings  # Import settings instance

# Create database tables if they don't exist
# For production, use Alembic migrations:
# alembic init alembic
# # edit alembic.ini, env.py
# alembic revision --autogenerate -m "Initial migration"
# alembic upgrade head
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables created or already exist.")
except Exception as e:
    print(f"Error creating database tables: {e}")

# --- Initial Admin User Creation ---
def create_initial_admin():
    db: Session = SessionLocal()
    try:
        admin_user = crud.get_user_by_email(db, email=settings.admin_email)
        if not admin_user:
            print(f"Creating initial admin user: {settings.admin_email}")
            admin_scopes = ["admin", "read:profile", "manage:users"]  # Example admin scopes
            user_in = models.UserCreateInternal(
                email=settings.admin_email,
                password=settings.admin_password,
                scopes=admin_scopes,
                is_active=True,
                is_google_user=False,
            )
            crud.create_user(db=db, user=user_in)
            print("Initial admin user created successfully.")
        else:
            # Ensure existing admin has the 'admin' scope
            if "admin" not in admin_user.scopes:
                print(
                    f"Adding 'admin' scope to existing user: {settings.admin_email}"
                )
                current_scopes = set(admin_user.scopes)
                current_scopes.add("admin")
                # Use the update mechanism
                user_update = models.UserUpdate(scopes=list(current_scopes))
                crud.update_user(
                    db, user_id=admin_user.id, user_update=user_update
                )
            else:
                print(f"Admin user '{settings.admin_email}' already exists.")

    finally:
        db.close()


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    # Run the synchronous function in a separate thread using asyncio.to_thread
    await asyncio.to_thread(create_initial_admin)
    print("Startup complete.")
    yield
    print("Shutting down...")

# Create the FastAPI app instance, passing the lifespan function
app_obj = FastAPI(
    title="Centralized Auth Service",
    description="Provides authentication and user management.",
    version="1.0.0",
    lifespan=lifespan  # Correctly pass the lifespan function here
)

# CORS Configuration
origins = [
    settings.frontend_url,  # The origin of your React frontend
    "http://localhost",  # Allow localhost if needed
    "http://localhost:8080",  # Allow other common dev ports
    # Add origins for your *other* client applications here!
    # e.g., "http://my-other-app.local:3000"
]

app_obj.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # Important for cookies/auth headers
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Include the API router
app_obj.include_router(api_router)


# Root endpoint (optional)
@app_obj.get("/")

async def root():
    return {"message": "Auth Service is running"}


if __name__ == "__main__":
    # Use environment variables for host/port if available, otherwise default
    host = (
        config.settings.backend_host
        if hasattr(config.settings, "backend_host")
        else "0.0.0.0"
    )
    port = (
        config.settings.backend_port
        if hasattr(config.settings, "backend_port")
        else 8000
    )
    uvicorn.run("main:app_obj", host=host, port=port, reload=True) # Remove lifespan here
