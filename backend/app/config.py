from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

class Settings(BaseSettings):
    # Load from environment variables
    
    # Backend
    database_url: str = "sqlite:///./auth_service.db"
    secret_key: str = "default_secret_key" # Provide a default or ensure .env is loaded
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    admin_email: str = "admin@example.com"
    admin_password: str = "password"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    

    # Google OAuth
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str | None = None

    # Frontend
    frontend_url: str = "http://localhost:5173"

    class Config:
        # This allows loading from environment variables automatically
        # and gives priority to them over .env file values if both exist
        env_file = '.env'
        env_file_encoding = 'utf-8'
        # If you want case-sensitive environment variables, remove the line below
        case_sensitive = False


settings = Settings()

# You might want basic validation here
# if not settings.google_client_id or not settings.google_client_secret:
#     print("Warning: Google OAuth credentials not configured.")
