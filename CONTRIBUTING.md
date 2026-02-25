# Engineering Guidelines: Delhi Traffic Reporting & Monitoring System (DTRS/DTMS)

This file contains the core principles, architecture, and development workflows for the DTRS/DTMS project.

## 1. Project Context & Vision
*   **Users:** Delhi Traffic Police (Mobile App) and Traffic Administration (Web Dashboard).
*   **Core Challenge:** Extremely patchy 3G/4G networks, high density of vehicles, and strict legal evidence requirements.
*   **Solution:** A zero-friction, Snapchat-like camera app that pushes lightweight 1-FPS frames over 4G for instant inference, and heavily compressed MP4 videos over Wi-Fi later.

## 2. Architecture Constraints (The Non-Negotiables)
*   **Monorepo:** You MUST operate within the Turborepo structure (`apps/mobile-app`, `apps/admin-dashboard`, `apps/api-service`, `packages/*`). Do NOT create standalone projects outside this structure.
*   **Mobile (DTRS):** React Native (Expo Bare Workflow). Prioritize native performance. MUST use `react-native-vision-camera` for headless extraction and `WatermelonDB` for offline-first resilience.
*   **Backend (DTMS):** FastAPI (Python). Must be completely asynchronous. Use Celery + Redis for the Heavy Sync (Stage 2) video processing.
*   **Frontend (Admin):** Next.js 14 (App Router). Optimize for rendering 1-FPS frames quickly with SVG overlays, not heavy 4K videos.
*   **DevOps:** The `docker-compose.yml` is the source of truth for local infrastructure (Postgres, Redis, MinIO, Toxiproxy).

## 3. Development Workflows
To maximize speed and structural integrity, we follow a modular development approach.

### Module Ownership:
*   **Mobile:** Handles React Native, Expo, Vision Camera, and WatermelonDB.
*   **Backend:** Handles FastAPI, Celery, Postgres, and MinIO integration.
*   **Frontend:** Handles Next.js, Tailwind, and React Query.
*   **Data Pipeline:** Handles YOLO inference integration, Google Cloud Vision OCR, and `piexif` metadata injection.
*   **Architecture:** Handles API specs, OpenAPI generation, and system design.

## 4. Coding Standards
*   **Performance First:** In the mobile app, avoid blocking the JS thread. Use Worklets/Skia for frame processing.
*   **Idempotency:** The backend MUST be idempotent. A mobile device dropping connection and retrying the same upload should never result in duplicate database entries.
*   **Legal Hardening:** Ensure EXIF metadata (GPS, Timestamps, Officer ID) is injected securely and SHA-256 hashes match between the Light Sync and Heavy Sync.

## 5. Execution
1.  **Check the Plan:** Always refer to `IMPLEMENTATION_PLAN.md` to know what phase we are in.
2.  **Report Progress:** After a significant milestone, provide a concise update.
3.  **Seek Confirmation for Destructive Actions:** Do not overwrite critical database schemas or delete core files without explicit permission.
