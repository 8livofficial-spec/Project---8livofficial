import sys
import re

file_path = r'c:\Users\Manasai stanly\Desktop\8live\Backend\main.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Request, HTTPException to imports
content = content.replace("from fastapi import FastAPI", "from fastapi import FastAPI, Request, HTTPException")

# 2. Extract everything before `async def consultation_scheduler_loop():`
idx = content.find("async def consultation_scheduler_loop():")
if idx == -1:
    print("Could not find consultation_scheduler_loop")
    sys.exit(1)

pre_content = content[:idx]

loop_content = content[idx:]
# Remove the startup event at the bottom
loop_content = re.sub(r'@app\.on_event\("startup"\)\s*async def startup_event\(\):\s*asyncio\.create_task\(consultation_scheduler_loop\(\)\)\s*', '', loop_content)

# We want to replace the `while True:` loop inside `consultation_scheduler_loop`
# with a single run under a GET endpoint.
new_endpoint = """@app.get("/api/cron/process-bookings")
async def cron_process_bookings(request: Request):
    auth_header = request.headers.get("Authorization")
    expected_secret = os.getenv("CRON_SECRET", "dev-cron-secret")
    
    if auth_header != f"Bearer {expected_secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    print("[SCHEDULER] Cron endpoint triggered!")
    try:
        # Query all active bookings from health_assessments
        res = supabase.table("health_assessments")\\
            .select("patient_id, full_name, first_name, last_name, booking_date, booking_time, room_url, consultation_fee_paid")\\
            .execute()
        
        if res.data:
            now = datetime.now()
            for row in res.data:
                booking_date = row.get("booking_date")
                booking_time = row.get("booking_time")
                patient_id = row["patient_id"]
                first_name = row.get("first_name") or ""
                last_name = row.get("last_name") or ""
                patient_name = row.get("full_name") or f"{first_name} {last_name}".strip() or "Patient"

                # ── CASE 1: Patient has a booked appointment ────────────────────────
                if booking_date and booking_time:
                    room_url = row.get("room_url") or "https://meet.google.com/abc-defg-hij"
                    booking_dt = parse_booking_dt(booking_date, booking_time)
                    if not booking_dt:
                        continue

                    # Time difference in minutes
                    diff_seconds = (booking_dt - now).total_seconds()
                    diff_minutes = diff_seconds / 60.0

                    # Let's find any active doctor_consultation for this patient
                    c_id = None
                    doctor_id = None
                    c_status = "scheduled"
                    c_res = supabase.table("doctor_consultations")\\
                        .select("id, doctor_id, status")\\
                        .eq("patient_id", patient_id)\\
                        .in_("status", ["scheduled", "calling", "attended"])\\
                        .order("created_at", desc=True)\\
                        .limit(1)\\
                        .execute()
                    
                    if c_res.data:
                        c_id = c_res.data[0]["id"]
                        doctor_id = c_res.data[0]["doctor_id"]
                        c_status = c_res.data[0]["status"]

                    # If the appointment is in the PAST
                    if diff_minutes < 0:
                        age_minutes = abs(diff_minutes)
                        
                        if c_status == "calling" and age_minutes > 15:
                            # Doctor called but patient never joined within 15 mins of call start -> NO-SHOW (Patient)
                            supabase.table("doctor_consultations").update({"status": "cancelled", "prescription_notes": "Patient No-Show"}).eq("id", c_id).execute()
                            supabase.table("health_assessments").update({"booking_date": None, "booking_time": None}).eq("patient_id", patient_id).execute()
                            # Free slot
                            supabase.table("doctor_availability").update({"is_booked": False}).eq("available_date", booking_date).eq("time_slot", booking_time).execute()

                        elif c_status == "scheduled" and age_minutes >= 30:
                            # Appointment time passed and doctor never called within 30 mins -> NO-SHOW (Doctor) -> auto-refund!
                            if c_id:
                                supabase.table("doctor_consultations").update({"status": "cancelled", "prescription_notes": "Doctor No-Show - Auto Refunded"}).eq("id", c_id).execute()
                            supabase.table("health_assessments").update({
                                "consultation_fee_paid": False,
                                "booking_date": None,
                                "booking_time": None
                            }).eq("patient_id", patient_id).execute()
                            supabase.table("doctor_availability").update({"is_booked": False}).eq("available_date", booking_date).eq("time_slot", booking_time).execute()
                            # Send refund notification
                            supabase.table("patient_notifications").insert({
                                "patient_id": patient_id,
                                "type": "refund_issued",
                                "title": "💸 Booking Cancelled & Refunded",
                                "message": f"Your consultation for {booking_date} at {booking_time} was cancelled as the doctor did not join. A full refund has been initiated."
                            }).execute()

                # ── CASE 2: Patient paid fee but NO booking date ────────────────────
                elif row.get("consultation_fee_paid") and not booking_date:
                    # Look for their consultation record
                    c_res = supabase.table("doctor_consultations")\\
                        .select("id, created_at")\\
                        .eq("patient_id", patient_id)\\
                        .in_("status", ["scheduled"])\\
                        .order("created_at", desc=True)\\
                        .limit(1)\\
                        .execute()

                    if c_res.data:
                        c_id = c_res.data[0]["id"]
                        created_at_str = c_res.data[0]["created_at"]
                        created_at_dt = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                        now_utc = datetime.now(created_at_dt.tzinfo)
                        
                        age_seconds = (now_utc - created_at_dt).total_seconds()
                        age_hours = age_seconds / 3600.0

                        # ── Timeout (5 hours) ──
                        if age_hours >= 5.0:
                            # 1. Update status to cancelled/refunded
                            supabase.table("doctor_consultations")\\
                                .update({"status": "cancelled", "prescription_notes": "Cancelled & Refunded: No doctor claimed within 5 hours."})\\
                                .eq("id", c_id)\\
                                .execute()

                            # 2. Reset patient's assessment/fee state
                            supabase.table("health_assessments")\\
                                .update({
                                    "consultation_fee_paid": False,
                                    "updated_at": datetime.now().isoformat()
                                })\\
                                .eq("patient_id", patient_id)\\
                                .execute()

                            # 3. Create notification
                            supabase.table("patient_notifications").insert({
                                "patient_id": patient_id,
                                "type": "refund_issued",
                                "title": "💸 Booking Cancelled & Refunded",
                                "message": f"We could not match you with a doctor within 5 hours. We have cancelled the request and issued a full refund of ₹499."
                            }).execute()

        return {"status": "success", "message": "Cron executed"}
    except Exception as e:
        print(f"[SCHEDULER LOOP ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))
"""

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(pre_content + new_endpoint)
print("Backend modified successfully.")
