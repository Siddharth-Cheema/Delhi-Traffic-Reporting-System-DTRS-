@echo off
echo Starting DTRS/DTMS Local Development Environment...

echo [1/3] Starting Docker Compose (Postgres, Redis, MinIO, Toxiproxy)...
docker-compose up -d

echo [2/3] Starting FastAPI Backend on Port 8000...
start "FastAPI Backend" cmd /k "cd apps\api-service && call venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [3/3] Starting Celery Worker...
start "Celery Worker" cmd /k "cd apps\api-service && call venv\Scripts\activate && celery -A app.celery_worker process_heavy_video worker --loglevel=info -P solo"

echo [4/4] Starting Next.js Admin Dashboard on Port 3000...
start "NextJS Dashboard" cmd /k "cd apps\admin-dashboard && npm run dev"

echo All services started!
echo - API: http://localhost:8000
echo - Admin Dashboard: http://localhost:3000
echo - MinIO Console: http://localhost:9001 (admin/admin123)

echo.
echo To run a simulated mobile app capture test:
echo 1. Open a new terminal
echo 2. cd apps\api-service
echo 3. call venv\Scripts\activate
echo 4. python simulate_mobile.py
