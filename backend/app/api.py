from fastapi import APIRouter
from .routes import auth, users, cookies

api_router = APIRouter(prefix="/api/v1") # Add a version prefix

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(cookies.router, prefix="/cookies", tags=["User Frontend Data"])

# Add a simple health check endpoint
@api_router.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}