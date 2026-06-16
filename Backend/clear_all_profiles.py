import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load config
load_dotenv(dotenv_path="Security/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase credentials not found.")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def clear_table(table_name, pk_col="id"):
    try:
        # Fetch all records
        res = supabase.table(table_name).select(pk_col).execute()
        if not res.data:
            print(f"Table {table_name} is already empty.")
            return
        
        # Delete each row by primary key
        count = 0
        for row in res.data:
            val = row[pk_col]
            supabase.table(table_name).delete().eq(pk_col, val).execute()
            count += 1
        print(f"Successfully deleted {count} rows from {table_name}.")
    except Exception as e:
        print(f"Failed to clear table {table_name}: {e}")

print("=== CLEARING ALL DATA FOR FRESH TEST ===")

# Delete child/dependent rows first
clear_table("progress_logs", "id")
clear_table("patient_notifications", "id")
clear_table("doctor_consultations", "id")
clear_table("doctor_wallet_transactions", "id")
clear_table("doctor_wallet", "id")
clear_table("doctor_profiles", "id")
clear_table("health_assessments", "patient_id")
clear_table("profiles", "id")

# Reset doctor availability slots
try:
    res = supabase.table("doctor_availability").update({"is_booked": False}).eq("is_booked", True).execute()
    print("Successfully reset doctor availability slots.")
except Exception as e:
    print(f"Failed to reset doctor availability: {e}")

print("========================================")
print("Done! All database records cleared. You can now test from scratch.")
