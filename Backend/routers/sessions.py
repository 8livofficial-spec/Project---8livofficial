import os
from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client
import uuid
import time
from datetime import datetime

from services.daily_service import DailyService
from auth import get_current_user, User

router = APIRouter(prefix="/api/sessions", tags=["Sessions (Staff/Patient)"])

# Initialize Supabase REST client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

async def verify_session_participant(
    session_id: str,
    current_user: User = Depends(get_current_user)
) -> dict:
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session UUID")

    res = supabase.table("sessions").select("*").eq("id", session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = res.data[0]
        
    if current_user.role == "admin":
        raise HTTPException(status_code=403, detail="Admin cannot access session room")
        
    if str(current_user.id) != str(session.get("member_id")) and str(current_user.id) != str(session.get("staff_id")):
        raise HTTPException(status_code=403, detail="You are not a participant of this session")
        
    return session

@router.get("/{session_id}/join-token")
async def get_join_token(
    session: dict = Depends(verify_session_participant),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a Daily.co meeting token for the verified participant.
    """
    room_name = session.get("daily_room_name")
    if not room_name:
        raise HTTPException(status_code=400, detail="Session does not have an active Daily.co room")

    # Staff are owners, patients are not
    is_owner = current_user.role in ["doctor", "dietitian", "trainer"]
    
    # Token expiry: 2 hours from scheduled_at, or if not set, 2 hours from now
    scheduled_at_str = session.get("scheduled_at")
    if scheduled_at_str:
        # Simplistic parsing, assumes ISO format
        try:
            dt = datetime.fromisoformat(scheduled_at_str.replace('Z', '+00:00'))
            exp_unix = int(dt.timestamp()) + 7200
        except ValueError:
            exp_unix = int(time.time()) + 7200
    else:
        exp_unix = int(time.time()) + 7200

    token = await DailyService.generate_token(
        room_name=room_name,
        is_owner=is_owner,
        exp_unix=exp_unix
    )
    
    return {"token": token}
