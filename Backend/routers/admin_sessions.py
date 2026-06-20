import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client

from auth import get_current_user, User

router = APIRouter(prefix="/api/admin", tags=["Admin Sessions"])

# Initialize Supabase REST client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

class RescheduleRequest(BaseModel):
    new_datetime: str

class CancelRequest(BaseModel):
    reason: str

@router.get("/members/{member_id}/sessions")
async def get_member_sessions(member_id: str):
    """Returns sessions for a member without exposing meeting URLs."""
    try:
        res = supabase.table("sessions").select("*").eq("member_id", member_id).order("scheduled_at", desc=True).execute()
        sessions = res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    safe_sessions = []
    for s in sessions:
        safe_sessions.append({
            "id": s.get("id"),
            "staff_id": s.get("staff_id"),
            "staff_role": s.get("staff_role"),
            "session_type": s.get("session_type"),
            "status": s.get("status"),
            "scheduled_at": s.get("scheduled_at"),
            "started_at": s.get("started_at"),
            "ended_at": s.get("ended_at"),
            "duration_minutes": s.get("duration_minutes"),
            "notes_added": s.get("notes_added"),
            "created_at": s.get("created_at")
        })
    return safe_sessions

@router.get("/members/{member_id}/sessions/stats")
async def get_member_session_stats(member_id: str):
    try:
        res = supabase.table("sessions").select("status").eq("member_id", member_id).execute()
        sessions = res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    stats = {
        "total": len(sessions),
        "completed": 0,
        "missed": 0,
        "cancelled": 0,
        "upcoming": 0,
        "in_progress": 0,
        "completion_rate": 0
    }

    for s in sessions:
        status = s.get("status")
        if status == "completed": stats["completed"] += 1
        elif status == "missed": stats["missed"] += 1
        elif status == "cancelled": stats["cancelled"] += 1
        elif status == "scheduled": stats["upcoming"] += 1
        elif status == "in_progress": stats["in_progress"] += 1

    if stats["total"] > 0:
        stats["completion_rate"] = int((stats["completed"] / stats["total"]) * 100)

    return stats

@router.get("/sessions/{session_id}/log")
async def get_session_log(session_id: str):
    try:
        res = supabase.table("session_logs").select("*").eq("session_id", session_id).order("timestamp").execute()
        logs = res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return [
        {
            "id": log.get("id"),
            "event": log.get("event"),
            "triggered_by": log.get("triggered_by"),
            "metadata": log.get("metadata_"),
            "timestamp": log.get("timestamp")
        } for log in logs
    ]

@router.post("/sessions/{session_id}/reschedule")
async def reschedule_session(session_id: str, payload: RescheduleRequest):
    try:
        res = supabase.table("sessions").update({
            "scheduled_at": payload.new_datetime,
            "status": "scheduled"
        }).eq("id", session_id).execute()
        
        if res.data:
            # Create log
            supabase.table("session_logs").insert({
                "session_id": session_id,
                "event": "rescheduled",
                "triggered_by": "admin",
                "metadata_": {"new_datetime": payload.new_datetime}
            }).execute()
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/cancel")
async def cancel_session(session_id: str, payload: CancelRequest):
    try:
        res = supabase.table("sessions").update({
            "status": "cancelled"
        }).eq("id", session_id).execute()
        
        if res.data:
            supabase.table("session_logs").insert({
                "session_id": session_id,
                "event": "cancelled",
                "triggered_by": "admin",
                "metadata_": {"reason": payload.reason}
            }).execute()
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
