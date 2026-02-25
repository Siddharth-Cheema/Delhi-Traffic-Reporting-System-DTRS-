# Delhi Traffic Reporting System (DTRS) & Monitoring System (DTMS)

A real-world, civic-tech solution designed for on-ground traffic enforcement in the chaotic environment of Indian traffic and patchy 4G networks.

This repository contains the full monorepo for the DTRS ecosystem, including the Mobile App for Traffic Police, the Backend API Data Engine, and the Frontend Admin Arbitration Dashboard.

---

## Architectural Philosophy

Standard heavy-video AI pipelines fail in Indian field conditions due to network instability, hardware limitations of standard-issue police smartphones, and the sheer volume of chaotic traffic data.

To overcome these constraints, this architecture completely rejects standard video-streaming models. Instead, we have engineered a system based on three core pillars:

1.  **The "Trojan Horse" Capture System:** An offline-first mobile application that looks and feels like a simple Snapchat video recorder to the user, but operates entirely differently under the hood, functioning as an asynchronous burst-frame extractor.
2.  **The Dual-Sync Network Engine:** A bifurcated networking layer that separates time-critical AI metadata (sent over patchy 4G) from heavy evidentiary video (sent over unmetered WiFi).
3.  **The RLHF Data Flywheel:** A human-in-the-loop Admin Dashboard that doesn't just review challans, but actively generates legally verified, localized, proprietary training data to continuously improve the AI models.

---

## The User Journey: Field Capture to Arbitration

The system is designed to minimize friction for the Traffic Cop while maximizing data integrity for the backend.

### The Field Capture
The Traffic Cop opens the DTRS mobile app, which boots instantly to a native camera viewfinder. They press and hold the capture button to record a short video of a traffic violation (e.g., a motorcycle driving on the wrong side or riders without helmets).

### Background Extraction & The Fast Ping
The moment the recording stops, the raw `.mp4` is saved to the local device storage. Instantly, a highly optimized, native background Worklet extracts frames from the video at 1 Frame Per Second (FPS).

Crucially, the app injects the current GPS coordinates and a secure timestamp directly into the EXIF metadata of every extracted `.jpg` frame. These lightweight frames are immediately dispatched over the available mobile network (4G/3G) to the Cloud AI via a "Fast Ping."

### The Lockout & Review
The system enforces a strict 10-Challan limit. A local database tracks the cop's session, and once 10 draft videos are queued, the capture button physically locks. This prevents the officer from accumulating an unmanageable backlog.

The cop is forced to open the Review Drawer. By this time, the Cloud AI has already responded to the Fast Ping with bounding box coordinates for unique vehicles. The cop taps a detected vehicle, selects the static violations (e.g., "No Helmet", "Triple Riding") from a quick checklist, and hits Submit. Zero manual text entry is required.

### The Heavy Sync
The tagged record moves to a `PENDING_WIFI` queue. A background task scheduler (WorkManager/BGTaskScheduler) monitors network connectivity. Upon detecting an unmetered (WiFi) connection, it silently pushes the heavy, original `.mp4` evidence files to the cloud storage vault.

### Deep Analysis & Admin Arbitration
Once the heavy video lands in the cloud, asynchronous Celery workers trigger the deep analysis pipeline, performing localized Automatic Number Plate Recognition (ANPR) and heuristic violation validation.

The record then surfaces on the DTMS Admin Dashboard. An administrator views a side-by-side matrix comparing the cop's manual tags with the AI's detection. The admin provides the final legal verification, approving the record for government integration (VAHAN) or rejecting it.

---

## The "Trojan Horse" Hybrid Capture System ((Please Don't take the Name too seriously :))

A fundamental challenge with AI traffic enforcement on mobile devices is the sheer processing power required to run inference on live video feeds, compounded by the bandwidth needed to upload those feeds for cloud processing.

The DTRS mobile app utilizes a "Trojan Horse" strategy. To the Traffic Cop, it appears they are simply recording a standard `.mp4` video. However, the true value lies in the background headless processing.

By using native OS APIs (via `react-native-vision-camera` and Skia Frame Processors) to extract 1-FPS frames on a dedicated background thread, we achieve two things:
1.  **Zero Viewfinder Lag:** The main JavaScript UI thread remains unblocked, ensuring the camera viewfinder maintains a smooth 60fps, crucial for tracking fast-moving vehicles.
2.  **Massive Data Reduction:** Instead of attempting to upload a 50MB video over a 3G network, the app only needs to transmit a few 200KB JPEG frames.

This hybrid approach guarantees that the cop always has the high-resolution video saved locally as undeniable legal evidence, while the AI gets the lightweight frames it needs for immediate processing.

---

## The Dual-Sync Network Engine

Indian mobile networks are notorious for high latency and sudden dropouts. A single, monolithic upload architecture would result in endless loading spinners and frustrated officers.

The Dual-Sync Engine solves this by bifurcating the data payload:

### The Light Sync (Immediate, 4G)
When the cop finishes recording, the app immediately fires an HTTP POST containing only the 1-FPS extracted `.jpg` frames. This lightweight payload can survive patchy 4G connections. The Cloud AI performs a rapid, single-stage object detection (e.g., YOLO11-Nano) merely to identify vehicle classes and bounding boxes, returning this JSON data almost instantly to populate the cop's review UI.

Crucially, the Light Sync also includes a **SHA-256 hash** of the newly generated `.mp4` file.

### The Heavy Sync (Background, WiFi)
The heavy lifting is deferred. The original high-resolution `.mp4` remains in a local queue until the device detects an unmetered WiFi connection. At that point, a background task uploads the video to the cloud vault (S3/MinIO).

The backend verifies the SHA-256 hash against the one received during the Light Sync, ensuring absolute legal integrity and proving the video evidence was not tampered with between capture and upload. Only after this Heavy Sync completes does the deep analysis (ANPR, OCR, Spatial Violation Logic) begin.

---

## Micro-Architecture Details

### Mobile App (React Native / Expo)
*   **Offline-First State:** Built on `WatermelonDB` (SQLite), the app functions entirely offline. A complex state machine tracks each capture from `DRAFT` to `SYNCING` to `UPLOADED`.
*   **Dirty Recovery Protocol:** If the app crashes or the OS kills the background thread mid-extraction, a startup routine scans the local cache for orphaned `.mp4` files and automatically re-queues them, ensuring zero data loss.
*   **Lockout Guard:** Reactive queries monitor the draft queue, automatically disabling the shutter when the 10-challan limit is reached to enforce workflow compliance.

### Backend API (FastAPI / Celery)
*   **Idempotency:** FastAPI middleware ensures that network retries from the mobile app don't result in duplicate database entries.
*   **Asynchronous Processing:** The `Fast Ping` is handled synchronously for immediate UI response, while the heavy processing (ANPR via Google Cloud Vision, Heuristic YOLO classification) is offloaded to a Redis-backed Celery queue.
*   **Spatial Heuristics:** Instead of training monolithic models to detect complex violations, the backend uses spatial math on base models. For example, `Triple Riding` is calculated by detecting the intersection over union (IoU) of `Person` bounding boxes within a `Motorcycle` bounding box.

### Admin Dashboard (Next.js)
*   **High-Speed Arbitration:** The UI is optimized for rapid decision-making, heavily utilizing keyboard shortcuts (A for Approve, R for Reject) and TanStack Query for instant state invalidation.
*   **Frame-Centric Rendering:** To maintain performance, the dashboard renders the lightweight keyframes with SVG bounding box overlays, fetching the 4K video only when deep review is requested.
*   **Consensus Engine:** The UI visually highlights when the officer's manual tags match the AI's detection, allowing the admin to fast-track approvals.

---

## The RLHF Data Engine

The true long-term value of the DTRS platform is not the AI model it ships with on Day 1, but its structural ability to improve itself on Day 100. Training custom AI models for the unpredictable nature of Indian roads (unstandardized license plates, unique vehicle types like auto-rickshaws, complex occlusion) is incredibly difficult.

We designed the Admin Arbitration Dashboard as a Reinforcement Learning from Human Feedback (RLHF) Data Engine.

When an Admin reviews a challan, they are inherently judging the AI's accuracy.
*   If the AI missed a violation the cop flagged, or if the AI generated a false positive, the Admin hits **Reject**.
*   This action triggers a specialized backend script. It takes the cropped image, the exact bounding box coordinates, and the Admin's verified reason code (e.g., `FALSE_POSITIVE`, `OCCLUSION`).
*   This payload is automatically packaged and pushed to a secure `Verified_Training_Data` S3 bucket.

This creates a proprietary, legally verified, highly localized dataset generated directly from daily police operations. This data vault is then utilized for automated weekly fine-tuning cycles, allowing the object detection and OCR models to continuously adapt and improve their accuracy on specific regional nuances without any manual, third-party data-labeling overhead.