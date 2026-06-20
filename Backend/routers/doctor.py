from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Load environment
load_dotenv(dotenv_path="Security/.env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

router = APIRouter(prefix="/api/doctor", tags=["doctor"])

class DoctorInitRequest(BaseModel):
    doctor_id: str
    email: str
    first_name: str = "Dr"
    last_name: str = "Unknown"

@router.post("/ensure-profile")
async def ensure_doctor_profile(req: DoctorInitRequest):
    """
    Ensures doctor profile exists in profiles table.
    Required before adding availability slots (FK constraint).
    Uses service-role to bypass RLS.
    """
    try:
        # Check if profile already exists
        response = supabase.table("profiles").select("id").eq("id", req.doctor_id).execute()
        
        if response.data and len(response.data) > 0:
            return {"success": True, "message": "Profile already exists"}
        
        # Create profile if missing
        insert_response = supabase.table("profiles").insert({
            "id": req.doctor_id,
            "role": "doctor",
            "email": req.email,
            "first_name": req.first_name,
            "last_name": req.last_name
        }).execute()
        
        if insert_response.data:
            return {"success": True, "message": "Profile created successfully"}
        else:
            return {"success": False, "error": "Failed to create profile"}
            
    except Exception as e:
        print(f"Error ensuring doctor profile: {str(e)}")
        return {"success": False, "error": str(e)}


@router.get("/profile-status/{doctor_id}")
async def check_profile_status(doctor_id: str):
    """
    Check if doctor profile exists in profiles table.
    """
    try:
        response = supabase.table("profiles").select("id").eq("id", doctor_id).execute()
        exists = response.data and len(response.data) > 0
        return {"exists": exists, "doctor_id": doctor_id}
    except Exception as e:
        print(f"Error checking profile status: {str(e)}")
        return {"exists": False, "error": str(e)}
