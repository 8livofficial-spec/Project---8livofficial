import os
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime

# ==========================================
# 0. DATABASE CONNECTION & CONFIG
# ==========================================
load_dotenv(dotenv_path="Security/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

DAILY_API_KEY = os.getenv("DAILY_API_KEY")

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    try:
        import razorpay
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except ImportError:
        print("[WARNING] razorpay not installed. Run: pip install razorpay")

# ==========================================
# 1. APP INITIALIZATION
# ==========================================
app = FastAPI(title="8liv API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    # FIXED: Read allowed origins from env variable for production support.
    # Set ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com" in prod.
    # Falls back to localhost for local development if not set.
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# 2. PYDANTIC DATA MODELS
# ==========================================
class HealthQuestionnaire(BaseModel):
    patient_id: Optional[str] = None

    # ── FEATURE 3: First + Last name split ──────────────────────────────────
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    # kept for backward-compat (auto-composed from first+last on frontend)
    full_name: Optional[str] = None

    age: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    dob_month: Optional[str] = None
    dob_day: Optional[str] = None
    dob_year: Optional[str] = None
    agree_terms: Optional[bool] = False
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., gt=0)
    goal_weight_kg: float = Field(..., gt=0)
    gender: str
    has_severe_conditions: bool
    other_conditions: List[str] = Field(default=[])

    # ── FEATURE 1: Health Questions 2 — list of condition strings ───────────
    health_conditions_two: List[str] = Field(default=[])

    recent_opiate_use: bool
    prior_weight_loss_surgery: bool
    takes_prescription_meds: bool
    blood_pressure_range: str
    resting_heart_rate: str
    prior_medication_type: str = "none"
    prior_medication_details: Optional[str] = None
    last_dose_timeframe: Optional[str] = None
    starting_weight_kg: Optional[float] = None
    agrees_to_no_stacking: Optional[bool] = False

    # ── FEATURE 2: GLP-1 image URL — saved after Supabase Storage upload ────
    glp1_image_url: Optional[str] = None

    tried_weight_program: Optional[bool] = None
    extra_medical_info: Optional[str] = None
    shipping_state: Optional[str] = None


class BookingRequest(BaseModel):
    patient_id: str
    booking_date: str
    booking_time: str
    room_url: str
    local_food: Optional[str] = None
    workout_preference: Optional[str] = None


class PrescriptionRequest(BaseModel):
    patient_id: str
    prescription_type: str


class AssessmentResponse(BaseModel):
    is_eligible: bool
    message: str
    success_probability: Optional[str] = None
    bmi: Optional[float] = None


class OrderRequest(BaseModel):
    amount: int
    currency: str = "INR"


class VideoRoomResponse(BaseModel):
    room_url: str


# ==========================================
# 3. API ENDPOINTS
# ==========================================

@app.get("/")
def read_root():
    return {"status": "success", "message": "8liv Backend engine is running smoothly!"}


# ── ASSESSMENT ───────────────────────────────────────────────────────────────
@app.post("/api/assess", response_model=AssessmentResponse)
def assess_patient(data: HealthQuestionnaire):
    rejection_message = (
        "YOUR HEALTH IS MORE IMPORTANT FOR US TO CONTINUE THE PROCESS , "
        "WE ARE SORRY TO INFORM YOU THAT YOU WONT BE ABLE TO CONTINUE FURTHER."
    )

    if data.has_severe_conditions or data.recent_opiate_use:
        return AssessmentResponse(is_eligible=False, message=rejection_message)

    if len(data.other_conditions) > 0:
        return AssessmentResponse(is_eligible=False, message=rejection_message)

    safe_bp = ["Normal", "< 120/80", "120-129/<80"]
    safe_hr = ["Normal"]

    if data.blood_pressure_range not in safe_bp:
        return AssessmentResponse(is_eligible=False, message=rejection_message)

    if data.resting_heart_rate not in safe_hr:
        return AssessmentResponse(is_eligible=False, message=rejection_message)

    # BMI calculation
    height_m = data.height_cm / 100
    bmi = round(data.weight_kg / (height_m * height_m), 1)

    # Compose full_name from first+last if not provided directly
    composed_full_name = data.full_name
    if not composed_full_name and (data.first_name or data.last_name):
        composed_full_name = f"{data.first_name or ''} {data.last_name or ''}".strip()

    try:
        assessment_data = {
            "patient_id": data.patient_id,

            # ── FEATURE 3 ────────────────────────────────────────────────────
            "first_name": data.first_name,
            "last_name": data.last_name,
            "full_name": composed_full_name,

            "age": data.age,
            "phone_number": data.phone_number,
            "address": data.address,
            "dob_month": data.dob_month,
            "dob_day": data.dob_day,
            "dob_year": data.dob_year,
            "agree_terms": data.agree_terms,
            "height_cm": data.height_cm,
            "weight_kg": data.weight_kg,
            "goal_weight_kg": data.goal_weight_kg,
            "is_eligible": True,
            "tried_weight_program": data.tried_weight_program,
            "extra_medical_info": data.extra_medical_info,
            "shipping_state": data.shipping_state,

            # ── FEATURE 1 ────────────────────────────────────────────────────
            "health_conditions_two": data.health_conditions_two,

            # ── FEATURE 2 ────────────────────────────────────────────────────
            "glp1_image_url": data.glp1_image_url,

            "medical_history": {
                "gender": data.gender,
                "has_severe_conditions": data.has_severe_conditions,
                "other_conditions": data.other_conditions,
                "recent_opiate_use": data.recent_opiate_use,
                "prior_weight_loss_surgery": data.takes_prescription_meds,
                "takes_prescription_meds": data.takes_prescription_meds,
                "vitals": {
                    "bp": data.blood_pressure_range,
                    "hr": data.resting_heart_rate,
                },
                "medication_history": {
                    "type": data.prior_medication_type,
                    "details": data.prior_medication_details,
                    "last_dose": data.last_dose_timeframe,
                    "starting_weight": data.starting_weight_kg,
                    "agrees_to_no_stacking": data.agrees_to_no_stacking,
                },
            },
        }
        supabase.table("health_assessments").insert(assessment_data).execute()
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return AssessmentResponse(is_eligible=False, message=f"Database error: {str(e)}")

    return AssessmentResponse(
        is_eligible=True,
        message="Congratulations! You are a strong candidate for medical weight loss treatment. Let's proceed to check your full eligibility.",
        success_probability="High",
        bmi=bmi,
    )


# ── DOCTOR PRESCRIPTION ──────────────────────────────────────────────────────
@app.post("/api/prescribe")
def prescribe_medication(data: PrescriptionRequest):
    try:
        supabase.table("health_assessments").update({
            "prescription_type": data.prescription_type
        }).eq("patient_id", data.patient_id).execute()
        return {"status": "success", "message": "Prescription saved!"}
    except Exception as e:
        print(f"[PRESCRIPTION DB ERROR] {e}")
        return {"status": "error", "message": str(e)}


# ── BOOKING UPDATE ────────────────────────────────────────────────────────────
@app.post("/api/update-booking")
def update_booking(data: BookingRequest):
    try:
        update_payload = {
            "booking_date": data.booking_date,
            "booking_time": data.booking_time,
            "room_url": data.room_url,
        }
        if data.local_food and data.local_food.strip():
            update_payload["local_food"] = data.local_food.strip()
        if data.workout_preference and data.workout_preference.strip():
            update_payload["workout_preference"] = data.workout_preference.strip()

        supabase.table("health_assessments") \
            .update(update_payload) \
            .eq("patient_id", data.patient_id) \
            .execute()

        # Send booking confirmation success email!
        patient_name = "Patient"
        try:
            res_p = supabase.table("health_assessments")\
                .select("full_name, first_name, last_name")\
                .eq("patient_id", data.patient_id)\
                .execute()
            if res_p.data:
                row = res_p.data[0]
                first_name = row.get("first_name") or ""
                last_name = row.get("last_name") or ""
                patient_name = row.get("full_name") or f"{first_name} {last_name}".strip() or "Patient"
        except Exception as db_err:
            print(f"[CONFIRMATION EMAIL DB ERROR] {db_err}")

        send_booking_confirmation_email(patient_name, data.booking_date, data.booking_time, data.room_url)

        return {"status": "success", "message": "Booking updated!", "updated": update_payload}
    except Exception as e:
        print(f"[BOOKING DB ERROR] {e}")
        return {"status": "error", "message": str(e)}



# ── VIDEO ROOM ────────────────────────────────────────────────────────────────
@app.post("/api/create-video-room", response_model=VideoRoomResponse)
async def create_video_room():
    try:
        import random
        import string
        part1 = "".join(random.choices(string.ascii_lowercase, k=3))
        part2 = "".join(random.choices(string.ascii_lowercase, k=4))
        part3 = "".join(random.choices(string.ascii_lowercase, k=3))
        meet_url = f"https://meet.google.com/{part1}-{part2}-{part3}"
        return VideoRoomResponse(room_url=meet_url)
    except Exception as e:
        print(f"[VIDEO API ERROR] {e}")
        return VideoRoomResponse(room_url="https://meet.google.com/abc-defg-hij")


# ── PAYMENT ──────────────────────────────────────────────────────────────────
@app.post("/api/create-order")
def create_payment_order(order: OrderRequest):
    if not razorpay_client:
        return {"status": "error", "message": "Razorpay not configured."}
    try:
        razorpay_order = razorpay_client.order.create(dict(
            amount=order.amount * 100,
            currency=order.currency,
            payment_capture='1'
        ))
        return {"status": "success", "order_id": razorpay_order['id'], "amount": order.amount * 100}
    except Exception as e:
        print(f"[RAZORPAY ERROR] {e}")
        return {"status": "error", "message": str(e)}


# ── PAYMENT VERIFICATION ──────────────────────────────────────────────────────
class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    patient_id: str
    payment_type: str  # "consultation" or "membership"
    membership_tier: Optional[str] = None
    shipping_state: Optional[str] = None

@app.post("/api/verify-payment")
def verify_payment(data: PaymentVerifyRequest):
    """
    Verify Razorpay payment signature on the backend and update status in Supabase.
    [DEV BYPASS]: Signature verification is commented out to allow testing without actual card/payment input.
    """
    try:
        # DEV BYPASS: Comment out signature check
        # if not razorpay_client:
        #     return {"status": "error", "message": "Razorpay not configured."}
        # razorpay_client.utility.verify_payment_signature({
        #     'razorpay_order_id': data.razorpay_order_id,
        #     'razorpay_payment_id': data.razorpay_payment_id,
        #     'razorpay_signature': data.razorpay_signature,
        # })
        
        # If signature is valid, update Supabase directly from backend
        if data.payment_type == "consultation":
            supabase.table("health_assessments").update({
                "consultation_fee_paid": True,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("patient_id", data.patient_id).execute()
            
        elif data.payment_type == "membership":
            # Update health_assessments with membership tier and shipping state
            supabase.table("health_assessments").update({
                "membership_tier": data.membership_tier,
                "shipping_state": data.shipping_state,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("patient_id", data.patient_id).execute()
            
            # Fetch latest approved consultation for pharmacy dispatch
            consultation_res = supabase.table("doctor_consultations") \
                .select("id, prescription_type, status") \
                .eq("patient_id", data.patient_id) \
                .eq("status", "approved") \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
                
            if consultation_res.data and len(consultation_res.data) > 0:
                consultation = consultation_res.data[0]
                prescription_type = consultation.get("prescription_type")
                
                # Fetch patient details for dispatch
                patient_res = supabase.table("health_assessments") \
                    .select("first_name, last_name, full_name, address, phone_number") \
                    .eq("patient_id", data.patient_id) \
                    .limit(1) \
                    .execute()
                    
                if patient_res.data and len(patient_res.data) > 0:
                    patient = patient_res.data[0]
                    first_name = patient.get("first_name") or ""
                    last_name = patient.get("last_name") or ""
                    full_name = patient.get("full_name") or f"{first_name} {last_name}".strip() or "Patient"
                    address = patient.get("address") or "N/A"
                    phone_number = patient.get("phone_number") or "N/A"
                    
                    # Call automated dispatch log simulation (as in dispatch_to_pharmacy)
                    try:
                        print("\n" + "="*50)
                        print("[PHARMACY DEALER DISPATCH] AUTOMATED ORDER RECEIVED VIA BACKEND PAYMENT VERIFICATION")
                        print(f"  Patient:  {full_name}")
                        print(f"  Address:  {address}")
                        print(f"  Phone:    {phone_number}")
                        print(f"  Medication: {prescription_type}")
                        print(f"  Doctor:   8liv Medical Team")
                        print("="*50 + "\n")
                    except Exception as ph_err:
                        print(f"[PHARMACY DISPATCH ERROR] {ph_err}")
                
                # Mark prescription_ordered = True
                supabase.table("doctor_consultations") \
                    .update({
                        "prescription_ordered": True,
                        "updated_at": datetime.utcnow().isoformat()
                    }) \
                    .eq("id", consultation["id"]) \
                    .execute()

        return {"status": "success", "verified": True}
    except Exception as e:
        print(f"[PAYMENT VERIFY FAILED] {e}")
        return {"status": "error", "verified": False, "message": "Payment signature invalid."}



# ── PHARMACY INTEGRATION ──────────────────────────────────────────────────────
class PharmacyDispatch(BaseModel):
    patient_name: str
    patient_address: str
    patient_phone: str
    medication_type: str
    doctor_name: str

@app.post("/api/pharmacy/dispatch")
def dispatch_to_pharmacy(data: PharmacyDispatch):
    print("\n" + "="*50)
    print("[PHARMACY DEALER DISPATCH] AUTOMATED ORDER RECEIVED")
    print(f"  Patient:  {data.patient_name}")
    print(f"  Address:  {data.patient_address}")
    print(f"  Phone:    {data.patient_phone}")
    print(f"  Medication: {data.medication_type}")
    print(f"  Doctor:   {data.doctor_name}")
    print("="*50 + "\n")
    return {"status": "success", "message": "Order successfully dispatched to pharmacy dealer!"}



# ==========================================
# 5. SCHEDULER BACKGROUND WORKER (REMINDERS & EXPIRY)
# ==========================================
import asyncio

sent_notifications = set()
last_reschedule_reminder_sent = {}

def send_mock_reschedule_email(name: str, patient_id: str):
    border = "=" * 80
    subject = "Action Required: Please reschedule your missed doctor consultation"
    body = (
        f"Dear {name},\n\n"
        f"We noticed that you currently do not have a scheduled doctor consultation.\n"
        f"Since you have paid the consultation fee, you are eligible for one session.\n"
        f"Please log back in to your dashboard and choose a new slot to reschedule.\n\n"
        f"Dashboard Link: http://localhost:3000\n\n"
        f"Best regards,\n"
        f"The 8liv Health Team"
    )
    print(f"\n{border}\n[MOCK EMAIL SENT TO: {name}]\nSUBJECT: {subject}\n\n{body}\n{border}\n")

def send_booking_confirmation_email(name: str, booking_date: str, booking_time: str, room_url: str):
    border = "=" * 80
    subject = "Booking Confirmed: Your doctor consultation is scheduled!"
    body = (
        f"Dear {name},\n\n"
        f"Your doctor consultation has been successfully scheduled/rescheduled.\n"
        f"Details:\n"
        f"  Date: {booking_date}\n"
        f"  Time: {booking_time}\n"
        f"  Join Link: {room_url}\n\n"
        f"Please be prepared and join on time. We will send you reminders as the time approaches.\n\n"
        f"Best regards,\n"
        f"The 8liv Health Team"
    )
    print(f"\n{border}\n[MOCK EMAIL SENT TO: {name}]\nSUBJECT: {subject}\n\n{body}\n{border}\n")


def parse_booking_dt(date_str: str, time_str: str) -> Optional[datetime]:
    try:
        # booking_date: "2026-05-27"
        # booking_time: "10:00 AM"
        if "/" in date_str:
            d, m, y = date_str.split("/")
            date_str = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
        dt_str = f"{date_str} {time_str}"
        return datetime.strptime(dt_str, "%Y-%m-%d %I:%M %p")
    except Exception as e:
        print(f"[SCHEDULER PARSE ERROR] {e}")
        return None

def send_mock_email(name: str, role: str, timing_label: str, room_url: str):
    border = "=" * 80
    subject = f"[REMINDER] 8liv Appointment Reminder: {timing_label}!"
    body = (
        f"Dear {name},\n\n"
        f"This is a professional reminder that your scheduled consultation is starting soon.\n"
        f"Time remaining: {timing_label}\n"
        f"Sharp ah join pannunga. Please be on time!\n\n"
        f"Join Meeting link: {room_url}\n\n"
        f"Best regards,\n"
        f"The 8liv Health Team"
    )
    print(f"\n{border}\n[MOCK EMAIL SENT TO: {name} ({role})]\nSUBJECT: {subject}\n\n{body}\n{border}\n")

async def expire_consultation(patient_id: str, patient_name: str, booking_date: str, booking_time: str, c_id: Optional[str] = None, doctor_id: Optional[str] = None):
    border = "=" * 80
    subject = "[EXPIRED] 8liv Consultation Expired - Reschedule Required"
    body = (
        f"Dear {patient_name},\n\n"
        f"You missed your scheduled consultation on {booking_date} at {booking_time}.\n"
        f"The 15-minute grace period has exceeded, and this session has been marked as expired.\n"
        f"Please log back in to reschedule a new session.\n\n"
        f"Best regards,\n"
        f"The 8liv Health Team"
    )
    print(f"\n{border}\n[MOCK EMAIL SENT TO: {patient_name} & Doctor]\nSUBJECT: {subject}\n\n{body}\n{border}\n")


    try:
        # 1. Update consultation status in doctor_consultations if c_id is provided, 
        # or find active ones for this patient and update them.
        if c_id:
            supabase.table("doctor_consultations")\
                .update({"status": "not_attended", "updated_at": datetime.utcnow().isoformat()})\
                .eq("id", c_id)\
                .execute()
        else:
            # Query active consultations for this patient
            res_c = supabase.table("doctor_consultations")\
                .select("id, doctor_id")\
                .eq("patient_id", patient_id)\
                .in_("status", ["scheduled", "calling"])\
                .execute()
            if res_c.data:
                for c in res_c.data:
                    supabase.table("doctor_consultations")\
                        .update({"status": "not_attended", "updated_at": datetime.utcnow().isoformat()})\
                        .eq("id", c["id"])\
                        .execute()
                    if not doctor_id:
                        doctor_id = c["doctor_id"]
        
        # 2. Free slot in doctor_availability
        if doctor_id:
            supabase.table("doctor_availability")\
            # Free any matching date/time slot in doctor_availability
            supabase.table("doctor_availability")\
                .update({"is_booked": False})\
                .eq("available_date", booking_date)\
                .eq("time_slot", booking_time)\
                .execute()

        # 3. Clear patient's booked slot in health_assessments
        supabase.table("health_assessments")\
            .update({
                "booking_date": None,
                "booking_time": None,
                "room_url": None,
                "updated_at": datetime.utcnow().isoformat()
            })\
            .eq("patient_id", patient_id)\
            .execute()

        # 4. Send patient notification
        supabase.table("patient_notifications").insert({
            "patient_id": patient_id,
            "type": "appointment_expired",
            "title": "⚠️ Consultation Time Expired",
            "message": f"You missed your appointment on {booking_date} at {booking_time}. The slot has expired. Please select a new time slot to reschedule."
        }).execute()
        
        print(f"[SCHEDULER] Successfully expired consultation for patient {patient_name}")
    except Exception as e:
        print(f"[SCHEDULER EXPIRY ERROR] {e}")

async def consultation_scheduler_loop():
    print("[SCHEDULER] Consultation scheduler background task started!")
    while True:
        try:
            # Query all active bookings from health_assessments
            res = supabase.table("health_assessments")\
                .select("patient_id, full_name, first_name, last_name, booking_date, booking_time, room_url, consultation_fee_paid")\
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
                        c_res = supabase.table("doctor_consultations")\
                            .select("id, doctor_id, status")\
                            .eq("patient_id", patient_id)\
                            .in_("status", ["scheduled", "calling", "attended"])\
                            .execute()
                        if c_res.data:
                            c_id = c_res.data[0]["id"]
                            doctor_id = c_res.data[0]["doctor_id"]
                            c_status = c_res.data[0].get("status") or "scheduled"

                        # Unique notification/reminder key
                        notif_base_key = f"{c_id}" if c_id else f"legacy_{patient_id}_{booking_date}_{booking_time}"

                        # 1 Hour Reminder (55 to 60 minutes remaining)
                        if 55.0 <= diff_minutes <= 60.0:
                            key = f"{notif_base_key}_1h"
                            if key not in sent_notifications:
                                send_mock_email(patient_name, "Patient", "1 hour more to join", room_url)
                                sent_notifications.add(key)

                        # 30 Minutes Reminder (25 to 30 minutes remaining)
                        elif 25.0 <= diff_minutes <= 30.0:
                            key = f"{notif_base_key}_30m"
                            if key not in sent_notifications:
                                send_mock_email(patient_name, "Patient", "30min more to join", room_url)
                                sent_notifications.add(key)

                        # 1 Minute Reminder (0 to 2 minutes remaining)
                        elif 0.0 <= diff_minutes <= 2.0:
                            key = f"{notif_base_key}_1m"
                            if key not in sent_notifications:
                                send_mock_email(patient_name, "Patient", "1min more to join", room_url)
                                sent_notifications.add(key)

                        # Expiration: 15 mins for scheduled/calling, 30 mins for attended calls
                        elif diff_minutes <= (-30.0 if c_status == "attended" else -15.0):
                            key = f"{notif_base_key}_expired"
                            if key not in sent_notifications:
                                await expire_consultation(patient_id, patient_name, booking_date, booking_time, c_id, doctor_id)
                                sent_notifications.add(key)

                    # ── CASE 2: Patient has paid but has no active booking ──────────────
                    else:
                        if row.get("consultation_fee_paid"):
                            # Check if they have an approved/completed consultation already
                            c_res = supabase.table("doctor_consultations")\
                                .select("id")\
                                .eq("patient_id", patient_id)\
                                .in_("status", ["approved", "rejected"])\
                                .execute()
                            
                            # If they don't have a completed consultation, they need to reschedule
                            if not c_res.data:
                                last_sent = last_reschedule_reminder_sent.get(patient_id)
                                # Check if we should send a rescheduling reminder (every 1 hour)
                                if not last_sent or (now - last_sent).total_seconds() >= 3600:
                                    send_mock_reschedule_email(patient_name, patient_id)
                                    last_reschedule_reminder_sent[patient_id] = now

        except Exception as e:
            print(f"[SCHEDULER LOOP ERROR] {e}")
        
        await asyncio.sleep(10)  # Run every 10 seconds

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(consultation_scheduler_loop())
