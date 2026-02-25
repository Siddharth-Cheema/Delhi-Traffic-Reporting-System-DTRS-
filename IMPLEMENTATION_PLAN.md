# Delhi Traffic Reporting & Monitoring System (DTRS/DTMS) - Master Implementation Plan

## Context
This plan details the implementation architecture for the **Delhi Traffic Reporting System (DTRS - Mobile App for Traffic Police)** and the **Delhi Traffic Monitoring System (DTMS - Admin Dashboard)**.

The proposed solution is a "Trojan Horse" Hybrid Capture System: an incredibly simple, Snapchat-like mobile app for Traffic Police that masks a powerful, asynchronous data engine. It prioritizes low-bandwidth efficiency (sending 1-FPS frames over 4G, heavy video over WiFi), legal evidence integrity (EXIF injection), and a human-in-the-loop training pipeline to continuously improve models on unstructured Indian road conditions.

This plan is the result of a cross-functional design session across Mobile, Backend, Frontend, and DevOps domains to ensure structural integrity and flawless cross-system integration.

---

## Phase 0: Infrastructure & DevOps (The Foundation)
**Goal:** Establish the Turborepo monorepo, Docker architecture, and a realistic network simulation environment to test Delhi's "patchy" 3G/4G connectivity.

### Architecture & Tools
*   **Monorepo:** Turborepo managing `apps/mobile-app` (React Native/Expo), `apps/admin-dashboard` (Next.js), `apps/api-service` (FastAPI), and `packages/*` for shared schemas.
*   **Containerization:** `docker-compose.yml` defining two networks: `backend-net` (internal) and `public-net` (exposed to clients).
*   **Network Simulation:** `Shopify/toxiproxy` integrated into Docker Compose to artificially induce latency, jitter, and packet loss (e.g., simulating a 100kbps 3G connection with 300ms latency) to stress-test the offline queue and dual-sync logic.

### Core Services (Docker Compose)
*   **PostgreSQL:** Primary data store for challans, officer profiles, and vehicle records.
*   **Redis:** Caching and background task broker for Celery/ARQ.
*   **MinIO:** S3-compatible local storage for evidentiary photos/videos.
*   **FastAPI:** Central backend service.

---

## Phase 1: DTRS Mobile App (The "Trojan Horse" Capture Engine)
**Goal:** Build a zero-friction, offline-first camera app that handles the 10-challan lockout and complex Dual-Sync logic.

### Tech Stack
*   **Framework:** React Native (Expo Bare Workflow)
*   **Camera Engine:** `react-native-vision-camera` + `vision-camera-skia`
*   **Database:** `WatermelonDB` (SQLite for persistence, Observables for reactivity)
*   **State:** `Zustand` (ephemeral) + `WatermelonDB` (source-of-truth)

### Core Workflows
1.  **Headless 1-FPS Extraction:** Frame processing happens strictly within a Vision Camera Worklet (via Skia Frame Processor) to avoid blocking the main JS thread, maintaining a 60fps viewfinder. Frames are saved to a temporary local cache.
2.  **10-Challan Lockout State Machine:**
    *   A reactive WatermelonDB query counts `status == DRAFT` challans.
    *   At 10 drafts, a `LockoutGuard` disables the shutter, blurs the camera via Skia, and forces open the `BottomSheet` "Swiggy-cart" review drawer.
3.  **Dual-Sync Idempotency & Legal Evidence Hash:**
    *   **Light Sync (Immediate, 4G):** Pushes JSON metadata, a heavily compressed 200x200 keyframe thumbnail, and crucially, a **SHA-256 hash of the `.mp4` generated the millisecond recording stops**. This ensures legal integrity, proving the video uploaded later wasn't tampered with.
    *   **Heavy Sync (Background, WiFi):** Background task uploads the full MP4 to MinIO/S3 using the same UUID to ensure the backend merges the records without double-billing.
4.  **Network Recovery & UI State:**
    *   If the app crashes during background extraction, a `DIRTY_RECOVERY` protocol scans the local cache on reboot to resume processing un-synced `.mp4` files.
    *   If the officer captures 10 videos but the 4G network drops before thumbnails return, the UI displays a "Processing Previous Captures..." lock state to manage officer expectations.

---

## Phase 2: DTMS Cloud Data Pipeline (The Asynchronous Brain)
**Goal:** Implement the two-stage analysis pipeline balancing speed for the mobile app and deep analysis for legal validity.

### Tech Stack
*   **API:** FastAPI (Asynchronous endpoints)
*   **Task Queue:** Celery 5.4 + Redis 7.0
*   **Inference:** ONNX Runtime + YOLO11 (Quantized Nano models)
*   **OCR:** Google Cloud Vision API
*   **Metadata:** `piexif`

### The Two-Stage Pipeline
1.  **Stage 1: Fast Ping (High Priority Queue)**
    *   Receives the Light Sync (1-FPS JPEG) over 4G.
    *   Processed via ONNX Runtime (sub 100ms inference).
    *   Returns bounding boxes and vehicle classes to the Mobile App's review drawer almost instantly.
2.  **Stage 2: Deep Analysis (Bulk Queue)**
    *   Triggered when the Heavy Sync (MP4) lands in S3/MinIO.
    *   A Celery worker runs specialized YOLO classifications (Helmet, Triple Riding, Wrong Side via segmentation tracking).
    *   **India Context Nuances:** The pipeline must include a **Plate Color Classifier** (Yellow/Commercial vs White/Private vs Green/EV) to determine specific zone legality. It also implements a heuristic for auto-rickshaw passenger limits.
    *   Crops the license plate and sends to Google Cloud Vision OCR.
    *   **Legal Hardening:** `piexif` injects `GPSLatitude`, `GPSLongitude`, and `DateTimeOriginal` directly into the final evidence JPEG binary before saving to the vault. It verifies the SHA-256 hash sent during the Light Sync matches the uploaded MP4.

---

## Phase 3: DTMS Admin Dashboard & Training Loop (The Human-in-the-Loop)
**Goal:** Build the high-speed arbitration workspace and the self-improving data flywheel.

### Tech Stack
*   **Frontend:** Next.js 14 (App Router)
*   **Styling:** Tailwind CSS + Shadcn UI
*   **State/Caching:** TanStack Query (React Query)
*   **Image Processing:** Custom SVG overlays over `react-easy-crop`

### The Arbitration Workspace
1.  **Frame-Centric UI:** To maintain high performance, the UI renders the 1-FPS extracted keyframes by default, using SVG overlays to draw the bounding boxes (translating normalized YOLO coordinates to pixels). The 4K video is fetched only "on-demand" for deep review.
2.  **Comparison Matrix:** Split pane showing the officer's manual tags vs. the automated inference. A 'Consensus Badge' glows green if they match, allowing the Admin to fast-track approval via keyboard shortcuts (A/R). The UI also includes a toggle for the **"Child Passenger Exception"** (as children under a certain age don't legally count for Triple Riding) to prevent corrupting the training dataset with false positives.
3.  **The Training Data Vault (The Moat):**
    *   When an Admin approves/rejects, the system ships a complete **Data Vault Entry** to a dedicated S3 bucket.
    *   *Rejections* require a Reason Code (e.g., `OCCLUSION`, `FALSE_POSITIVE`). This specific crop, bounding box, label, and consensus match become the proprietary dataset for the next weekly fine-tuning cycle.
4.  **VAHAN Integration:** A mock endpoint formats the final verified JSON into the government's required schema and pushes it.

---

## Phase 4: Integration & Verification Protocol
1.  **Toxiproxy Queue Stress Test:** Disable network via Toxiproxy, generate 10 challans on Mobile, verify UI lockout, and confirm WatermelonDB persistence.
2.  **The Reconnect Race:** Enable Toxiproxy with 500ms latency/packet loss. Trigger sync and verify FastAPI's idempotency middleware prevents duplicate DB entries.
3.  **End-to-End Pipeline Check:** Mobile Capture -> Fast Ping Return -> Officer Review -> WiFi Video Upload -> Deep Analysis -> Next.js Admin Arbitration -> Training Vault Export.

---

## Phase 5: Architecture Review & Deep Logical Validation
**Goal:** Rigorously audit the entire implemented system against the initial specifications. Ensure the system architecture is functioning correctly and validate edge cases.

### Deep Validation Workflows
1.  **Protocol Validation:** Verify that the system was built using the correct architectural patterns. Re-establish the `CONTRIBUTING.md` guidelines if they drifted.
2.  **Mobile Edge Case Testing:**
    *   Validate the `DIRTY_RECOVERY` protocol (what happens if the app crashes mid-upload?).
    *   Verify the exact hashing algorithm (SHA-256) matches between the 4G fast-ping and the Wi-Fi video upload.
3.  **Data Processing & Backend Stress Testing:**
    *   Verify `cv2` and `onnxruntime` memory leaks during heavy queue processing in Celery.
    *   Test OCR fallback mechanisms if the Google Cloud Vision API fails or rate-limits.
    *   Validate EXIF data (piexif) extraction integrity (ensure Officer ID and GPS aren't malformed).
4.  **Admin UI Consistency:**
    *   Test keyboard shortcut debouncing (preventing double-approvals).
    *   Verify that the "Child Passenger Exception" toggle actually alters the final JSON payload sent to VAHAN.

---

## Phase 6: Specialized Traffic Implementation (NEW)
**Goal:** Replace the mocked generic logic with specialized Indian traffic violation detection (Helmet, Triple Riding) and real ANPR (Automatic Number Plate Recognition) pipelines.

### Execution Steps
1.  **ANPR & OCR Pipeline Refinement:**
    *   Update `celery_worker.py` to use YOLO bounding box coordinates to dynamically crop the license plate *before* sending it to OCR.
    *   Refine the OCR logic to strip special characters and enforce Indian number plate formats (e.g., `DL-01-AB-1234`).
2.  **Heuristic Violation Logic (Python Spatial Math):**
    *   Implement logic in `yolo_inference.py` to detect `Helmet` and `No-Helmet` classes.
    *   Implement Intersection over Union (IoU) spatial mapping: Check if the bottom-center of a `Rider` bounding box falls within the `Motorcycle` bounding box.
    *   If `Rider count > 2` for a single motorcycle, flag `TRIPLE_RIDING`.
    *   If a `Rider` bounding box contains a `No-Helmet` detection in its top quadrant, flag `NO_HELMET`.
3.  **Model Loading & Weights Management:**
    *   Update `yolo_inference.py` to gracefully download weights from a reliable URL if they aren't found locally, preventing system crashes.
