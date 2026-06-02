import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load config
load_dotenv(dotenv_path="Security/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase environment variables not found")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def clear_data():
    print("Clearing patient data from database...")
    
    # 1. Delete progress logs
    try:
        res = supabase.table("progress_logs").delete().neq("id", 0).execute()
        print(f"Cleared progress_logs: {len(res.data)} rows")
    except Exception as e:
        print("progress_logs clear failed:", e)

    # 2. Delete patient notifications
    try:
        res = supabase.table("patient_notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"Cleared patient_notifications: {len(res.data)} rows")
    except Exception as e:
        print("patient_notifications clear failed:", e)

    # 3. Delete doctor consultations
    try:
        res = supabase.table("doctor_consultations").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"Cleared doctor_consultations: {len(res.data)} rows")
    except Exception as e:
        print("doctor_consultations clear failed:", e)

    # 4. Delete health assessments (using patient_id if id fails)
    try:
        # Try patient_id since health_assessments might use patient_id as PK
        res = supabase.table("health_assessments").delete().neq("patient_id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"Cleared health_assessments: {len(res.data)} rows")
    except Exception as e:
        print("health_assessments clear failed:", e)

    # 5. Reset doctor availability
    try:
        res = supabase.table("doctor_availability").update({"is_booked": False}).eq("is_booked", True).execute()
        print(f"Reset doctor_availability: {len(res.data)} slots freed")
    except Exception as e:
        print("doctor_availability reset failed:", e)

    print("\nData cleared successfully. You can now test from scratch!")

if __name__ == "__main__":
    clear_data()
