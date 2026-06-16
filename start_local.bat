@echo off
echo Starting 8live Local Development Environment...

:: Start Backend in a new window
echo Starting FastAPI Backend...
start cmd /k "cd Backend && python -m uvicorn main:app --reload --port 8000"

:: Start Frontend in a new window
echo Starting Next.js Frontend...
start cmd /k "cd frontend && npm run dev"

echo Both services are starting up!
echo Frontend will be available at http://localhost:3000
echo Backend API will be available at http://127.0.0.1:8000
