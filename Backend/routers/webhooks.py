import os
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
import json
from datetime import datetime
from supabase import create_client

from services.daily_service import DailyService

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

# Initialize Supabase REST client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

async def process_daily_webhook(payload: dict):
    """Processes Daily.co webhook asynchronously via Supabase REST."""
    event_type = payload.get("type")
    data = payload.get("payload", {})
    room_name = data.get("room")
    
    if not room_name:
        return

    # Find session
    res = supabase.table("sessions").select("*").eq("daily_room_name", room_name).execute()
    if not res.data:
        return # Not our room
        
    session = res.data[0]
    session_id = session["id"]
        
    update_data = {"daily_session_id": data.get("meeting_id")}
        
    if event_type == "meeting.started":
        update_data["status"] = "in_progress"
        update_data["started_at"] = datetime.utcnow().isoformat()
        
        supabase.table("session_logs").insert({
            "session_id": session_id,
            "event": "started",
            "triggered_by": "system",
            "metadata_": {"meeting_id": data.get("meeting_id")}
        }).execute()
        
    elif event_type == "participant.joined":
        participant_name = data.get("participant", {}).get("user_name", "Unknown")
        is_owner = data.get("participant", {}).get("owner", False)
        triggered_by = "doctor" if is_owner else "patient"
        
        supabase.table("session_logs").insert({
            "session_id": session_id,
            "event": "participant_joined",
            "triggered_by": triggered_by,
            "metadata_": {"participant_name": participant_name, "is_owner": is_owner}
        }).execute()
        
    elif event_type == "participant.left":
        participant_name = data.get("participant", {}).get("user_name", "Unknown")
        is_owner = data.get("participant", {}).get("owner", False)
        triggered_by = "doctor" if is_owner else "patient"
        duration = data.get("participant", {}).get("duration", 0)
        
        supabase.table("session_logs").insert({
            "session_id": session_id,
            "event": "participant_left",
            "triggered_by": triggered_by,
            "metadata_": {"participant_name": participant_name, "duration_seconds": duration}
        }).execute()
        
    elif event_type == "meeting.ended":
        update_data["status"] = "completed"
        ended_at = datetime.utcnow()
        update_data["ended_at"] = ended_at.isoformat()
        
        started_at_str = session.get("started_at")
        duration_minutes = 0
        if started_at_str:
            try:
                started_at = datetime.fromisoformat(started_at_str.replace('Z', '+00:00'))
                # convert ended_at to aware datetime for subtraction
                import datetime as dt
                ended_at_aware = ended_at.replace(tzinfo=dt.timezone.utc)
                diff = ended_at_aware - started_at
                duration_minutes = int(diff.total_seconds() / 60)
                update_data["duration_minutes"] = duration_minutes
            except Exception:
                pass
        
        supabase.table("session_logs").insert({
            "session_id": session_id,
            "event": "ended",
            "triggered_by": "system",
            "metadata_": {"meeting_id": data.get("meeting_id"), "duration_minutes": duration_minutes}
        }).execute()
        
    # Apply updates to session
    supabase.table("sessions").update(update_data).eq("id", session_id).execute()

@router.post("/daily")
async def daily_webhook(request: Request, background_tasks: BackgroundTasks):
    body_bytes = await request.body()
    signature = request.headers.get("X-Webhook-Signature")
    
    if not DailyService.verify_webhook_signature(signature, body_bytes):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
        
    try:
        payload = json.loads(body_bytes)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
        
    background_tasks.add_task(process_daily_webhook, payload)
    
    return {"status": "ok"}
