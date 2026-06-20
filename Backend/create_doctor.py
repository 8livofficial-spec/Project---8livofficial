import os
import sys
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
from supabase import create_client

# Load config
load_dotenv(dotenv_path="Security/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase environment variables not found in Security/.env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def main():
    print("\n=== Create Doctor Profile Tool ===")
    email = input("Enter Doctor Email (e.g. hussainthowfiq4@gmail.com): ").strip()
    password = input("Enter Password: ").strip()
    full_name = input("Enter Doctor Full Name (e.g. Dr. Thowfiq Hussain): ").strip()

    if not email or not password or not full_name:
        print("Error: All fields are required.")
        sys.exit(1)

    try:
        print("\nLogging in user...")
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        user = res.user
        if not user:
            print("Error: Login failed. Check credentials.")
            sys.exit(1)

        print(f"Logged in successfully. User ID: {user.id}")

        # Check if profiles entry exists (required for foreign key constraints)
        profiles_check = supabase.from_("profiles").select("*").eq("id", user.id).execute()
        if not profiles_check.data:
            print("Creating profiles entry...")
            supabase.from_("profiles").upsert({
                "id": user.id,
                "role": "doctor",
                "first_name": full_name.split()[1] if len(full_name.split()) > 1 else "Dr",
                "last_name": " ".join(full_name.split()[2:]) if len(full_name.split()) > 2 else full_name.split()[0] if len(full_name.split()) > 1 else "Unknown",
                "email": email
            }).execute()
            print("Profiles entry created successfully.")
        else:
            print("Profiles entry already exists for this user!")

        # Check if doctor_profiles entry already exists
        profile_check = supabase.from_("doctor_profiles").select("*").eq("id", user.id).execute()
        if profile_check.data:
            print("Doctor profile already exists for this user!")
        else:
            print("Creating doctor profile...")
            supabase.from_("doctor_profiles").insert({
                "id": user.id,
                "full_name": full_name
            }).execute()
            print("Doctor profile created successfully.")

        # Check if wallet already exists
        wallet_check = supabase.from_("doctor_wallet").select("*").eq("doctor_id", user.id).execute()
        if wallet_check.data:
            print("Doctor wallet already exists for this user!")
        else:
            print("Creating doctor wallet...")
            supabase.from_("doctor_wallet").insert({
                "doctor_id": user.id,
                "balance": 0,
                "total_earned": 0,
                "total_withdrawn": 0
            }).execute()
            print("Doctor wallet created successfully.")

        print("\nSUCCESS: You can now log into the Doctor Dashboard!")

    except Exception as e:
        print(f"\nError occurred: {str(e)}")

if __name__ == "__main__":
    main()
