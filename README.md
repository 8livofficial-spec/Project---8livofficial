# 8Liv Telemedicine Platform

8Liv is a telemedicine and wellness web application connecting patients with healthcare providers (doctors, dietitians, trainers) for personalized weight management programs.

## Key Features

*   **Assessment & Eligibility**: Automated screening quiz using patient health metrics to determine program eligibility.
*   **Onboarding Workflow**: Step-by-step state management guiding users through registration, consultation payment, scheduling, and portal access.
*   **Video Consultations**: Secure real-time video sessions powered by Stream Video SDK.
*   **Provider Scheduling**: Flexible slot management allowing care team members to configure manual and recurring availability.
*   **Administrative Panel**: Interfaces for user management, provider verification, transaction reconciliation, and pharmacy order fulfillment.

## Technology Stack

*   **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion
*   **Backend**: Python (FastAPI), Next.js Serverless API routes
*   **Database & Auth**: PostgreSQL (Supabase), Row Level Security (RLS) policies
*   **Third-Party APIs**: Stream Video SDK, Razorpay Payment Gateway

## Project Structure

*   `frontend/` - Next.js App Router source code and components.
*   `Backend/` - FastAPI service code and API routers.
*   `Database/` - PostgreSQL schema definition and migrations scripts.
*   `start_local.bat` - Script to run both local servers concurrently.

## Environment Setup

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
NEXT_PUBLIC_STREAM_API_KEY=
STREAM_API_SECRET=
```

### Backend (`Backend/.env`)
```env
SUPABASE_URL=
SUPABASE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

## Setup and Running

1.  **Start all services locally**:
    Run `start_local.bat` (Windows) or execute the respective startup commands in the backend and frontend directories.

2.  **Run Backend manually**:
    ```bash
    cd Backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    python -m uvicorn main:app --reload --port 8000
    ```

3.  **Run Frontend manually**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## Database Setup

Schema definitions and migration scripts are located in the `Database/` directory. Run them against your PostgreSQL/Supabase instance.
