from sqlalchemy import Column, Integer, String, JSON, DateTime, func, Boolean
from sqlalchemy.ext.declarative import declarative_base
import datetime
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True) # Nullable for Google-only users
    scopes = Column(JSON, nullable=False, default=[]) # Store scopes as a JSON list
    is_active = Column(Boolean, default=True)
    is_google_user = Column(Boolean, default=False) # Flag for users created via Google
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Field to store frontend 'cookies' data
    frontend_data = Column(JSON, nullable=True, default={})
