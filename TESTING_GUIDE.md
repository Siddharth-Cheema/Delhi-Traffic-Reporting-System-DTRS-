# E2E Integration & Testing Guide

This document outlines how to test the DTRS/DTMS system under simulated 3G/4G network conditions.

## 1. Starting the Infrastructure
Ensure Docker Desktop is running.
```bash
docker-compose up -d
```
This starts PostgreSQL, Redis, MinIO (S3), and Toxiproxy.

## 2. Simulating Patchy Networks (Toxiproxy)
We use Shopify's Toxiproxy to simulate poor cellular reception in Delhi.

**Create a high-latency, lossy 3G connection proxy:**
```bash
# Exec into the toxiproxy container (or use the CLI if installed locally)
curl -X POST -d '{"name": "slow_api", "listen": "0.0.0.0:8000", "upstream": "fastapi:8000"}' http://localhost:8474/proxies

# Add 500ms latency and 10% packet loss
curl -X POST -d '{"type": "latency", "attributes": {"latency": 500}}' http://localhost:8474/proxies/slow_api/toxics
curl -X POST -d '{"type": "timeout", "attributes": {"timeout": 2000}}' http://localhost:8474/proxies/slow_api/toxics
```
*Note: The Mobile App should be pointed to `http://<YOUR_LOCAL_IP>:8000` to route traffic through the proxy.*

## 3. Running the Backend
```bash
cd apps/api-service
source venv/Scripts/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

In a separate terminal, start the Celery worker for heavy video processing:
```bash
cd apps/api-service
source venv/Scripts/activate
celery -A app.celery_worker process_heavy_video worker --loglevel=info
```

## 4. Running the Admin Dashboard
```bash
cd apps/admin-dashboard
npm run dev
```
Access at `http://localhost:3000/arbitration`

## 5. Verification Checklist
- [ ] **Dual-Sync:** Capture a video on mobile. Observe the Fast Ping (`/api/v1/capture/ping`) return bounding boxes instantly.
- [ ] **Lockout:** Capture 10 videos rapidly. The camera MUST lock, forcing the review drawer open.
- [ ] **Heavy Sync:** Connect to Wi-Fi. The background task uploads the `.mp4` to MinIO.
- [ ] **Arbitration:** The Next.js dashboard shows the uploaded video with the YOLO bounding box overlay. Click 'Approve' to trigger the Training Vault export.