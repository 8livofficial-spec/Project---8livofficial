import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path="Security/.env")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

res = supabase.table("health_assessments").select("patient_id").execute()
for r in res.data:
    pid = r["patient_id"]
    supabase.table("health_assessments").delete().eq("patient_id", pid).execute()
    print(f"Deleted health_assessment for {pid}")

print("Done deleting health_assessments")
