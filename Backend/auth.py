from fastapi import Depends, HTTPException, Header
from pydantic import BaseModel
import os
import jwt

class User(BaseModel):
    id: str
    role: str

async def get_current_user(authorization: str = Header(None)) -> User:
    """
    Validates Supabase JWT and returns the current user.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
        
    token = authorization.split(" ")[1]
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET") # ensure this is set if using real verification
    if not jwt_secret:
        raise HTTPException(status_code=500, detail="Server misconfiguration: SUPABASE_JWT_SECRET missing")
        
    try:
        # Enforce secure verification of the JWT signature
        decoded = jwt.decode(token, jwt_secret, algorithms=["HS256"], audience="authenticated")
        user_id = decoded.get("sub")
        user_role = decoded.get("user_metadata", {}).get("role", "patient") # fallback
        
        # If admin, ensure we can identify them
        if decoded.get("email") == "admin@8liv.com" or user_role == "admin":
             user_role = "admin"

        return User(id=user_id, role=user_role)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
