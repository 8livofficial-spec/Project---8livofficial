import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from supabase import create_client

load_dotenv(dotenv_path="Security/.env")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def force_delete_all(table_name, id_col="id"):
    res = supabase.table(table_name).select(id_col).execute()
    count = 0
    for r in res.data:
        val = r[id_col]
        supabase.table(table_name).delete().eq(id_col, val).execute()
        count += 1
    print(f"Force deleted {count} rows from {table_name}")

force_delete_all("doctor_consultations")
force_delete_all("patient_notifications")
force_delete_all("progress_logs", "id")
force_delete_all("health_assessments", "patient_id")

res = supabase.table("doctor_availability").update({"is_booked": False}).eq("is_booked", True).execute()
print("Reset doctor_availability slots")
