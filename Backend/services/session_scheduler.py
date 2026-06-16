import asyncio
import os
from datetime import datetime, timedelta
from supabase import create_client

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

async def check_missed_sessions():
    """
    Background job to auto-mark scheduled sessions as missed 
    if they are 15 minutes past their scheduled_at time.
    """
    while True:
        try:
            # 15 minutes ago
            cutoff_time = (datetime.utcnow() - timedelta(minutes=15)).isoformat()
            
            # Find scheduled sessions where scheduled_at < cutoff_time
            res = supabase.table("sessions").select("*").eq("status", "scheduled").lt("scheduled_at", cutoff_time).execute()
            stale_sessions = res.data
            
            for session in stale_sessions:
                session_id = session["id"]
                
                # Update status
                supabase.table("sessions").update({"status": "missed"}).eq("id", session_id).execute()
                
                # Create log
                supabase.table("session_logs").insert({
                    "session_id": session_id,
                    "event": "missed",
                    "triggered_by": "system",
                    "metadata_": {"reason": "Auto-marked missed due to 15 minute expiry"}
                }).execute()
                
                # Trigger admin notification here if needed
                
        except Exception as e:
            print(f"[Scheduler Error] {e}")
            
        # Run every 5 minutes
        await asyncio.sleep(300)

def start_scheduler():
    loop = asyncio.get_event_loop()
    loop.create_task(check_missed_sessions())
