# PRD: Civic-Tech Traffic Enforcement Prototype

## 1. Executive Summary & Core Philosophy
This application is a real-world, civic-tech solution for on-ground traffic enforcement. To succeed in the chaotic environment of Indian traffic and patchy 4G networks, the architecture rejects standard heavy-video pipelines. Instead, it relies on a "Trojan Horse" Hybrid Capture System (looks like video to the user, acts like burst-frames to the cloud) and an asynchronous Dual-Sync Network Engine.

Furthermore, the system utilizes a pipeline of pre-trained models (like the India Driving Dataset and Roboflow) to bypass the impossible task of training a custom AI from scratch. The product's true value proposition is the RLHF Data Engine—an Admin dashboard that generates legally verified, proprietary training data through daily police operations, allowing the system to get smarter every week.

## 2. The User App: Traffic Cop Journey (UI/UX & Figma Context)
The mobile app must prioritize zero-friction capture, one-handed operation, and extreme respect for local storage and bandwidth.

### Phase A: The "Snapchat" Capture
- **The UX:** The app opens instantly to the camera viewfinder. The cop presses and holds to record video, allowing for smooth, native zooming to track distant vehicles.
- **The Background Engine:** The moment the recording stops, the raw .mp4 is saved locally. Immediately, a highly optimized, background native thread extracts frames at 1 FPS from the video.
- **Metadata Injection:** The engine injects the current GPS coordinates and a secure timestamp into the EXIF data of every extracted .jpg frame.

### Phase B: The Silent Ping & The Lockout
- **Foreground Sync:** While the cop continues their shift, the app silently fires the lightweight, extracted .jpg frames over mobile data to the Cloud AI to identify unique vehicles.
- **The 10-Challan Limit:** A local database tracks the user's session. Once 10 videos sit in the READY_FOR_REVIEW queue, the capture button locks. The cop is forced to review the queue, preventing an unmanageable backlog.

### Phase C: The "Swiggy Cart" Review
- **The UI:** The cop opens a right-side pane and taps a pending video. The Cloud AI has already pinged back the bounding box coordinates of the unique vehicles.
- **The Flow:** The app dynamically crops the local video frames based on those coordinates, displaying thumbnails of the unique vehicles.
- **The Tagging:** The cop taps a vehicle. A drop-down checklist appears. They select the static violations (e.g., Wrong-side driving, No Helmet) and hit Submit. Zero manual text entry is required.
- **State Change:** The item moves from the Review Queue to the PENDING_WIFI upload queue.

## 3. Mobile Client Architecture & Headless Scripts
To ensure the camera never freezes and the app doesn't crash on low-end devices, the mobile architecture relies heavily on background processing and local state management. The UI is simply a skin over these headless engines.

### A. The Headless Frame Extractor (Critical Engine)
Extracting frames locally is computationally heavy. This must be a pure background function taking a raw .mp4 file path as input and outputting 3-5 .jpg frame paths.
- **Architecture Warning:** Do not use legacy libraries like FFmpegKit (retired/unstable).
- **The Tech Stack:** Use native OS APIs bridged to the app.
  - Android: MediaMetadataRetriever or the new Media3 FrameExtractor API.
  - iOS: AVAssetImageGenerator.
- **Threading:** This must execute on a dedicated background thread/Worklet. If run on the main UI/JavaScript thread, the camera viewfinder will stutter.
- **Garbage Collection:** Once frames are converted to Base64/Multipart and successfully pinged to the cloud, the temporary image cache must be wiped immediately.

### B. Local State Queue & Database Manager
A local database (SQLite, Room, or WatermelonDB) manages the complex capture-to-upload lifecycle and the "10 Challan" lockout logic.
- **Core Tables:** SessionData and ChallanRecords.
- **State Machine Pipeline:** Every capture moves through these strict states:
  1. CAPTURED (Video saved locally)
  2. EXTRACTING (Headless engine running)
  3. READY_FOR_REVIEW (Frames sent, waiting for cop's manual tagging)
  4. PENDING_WIFI (Tagged, waiting for unmetered network)
  5. UPLOADED (Sync complete, trigger local MP4 deletion)
- **The Blocker Logic:** count_pending_reviews(). If count >= 10, trigger a state change that locks the Camera UI and forces the Review UI open.

### C. Dual-Sync API Engine (Network Layer)
The networking scripts bifurcate the data payload to survive patchy mobile networks.
- **The Foreground Ping (Mobile Data):** A lightweight HTTP POST script that sends only the extracted .jpg frames to the cloud.
- **The Webhook Listener:** Waits for the cloud to reply with the JSON array of unique vehicle bounding boxes and updates the local database ChallanRecords.
- **The Background Heavy-Lifter (Wi-Fi/5G):** A script using WorkManager (Android) or BGTaskScheduler (iOS). It wakes up upon detecting an unmetered connection and silently pushes the heavy .mp4 files from the PENDING_WIFI queue to the cloud storage bucket.

### D. The EXIF Metadata Injector
To ensure evidence is legally sound for government integration (VAHAN), metadata must be physically embedded into the files, not just sent alongside them.
- **The Action:** A standalone function inject_exif(image_path, latitude, longitude, timestamp).
- **The Execution:** It embeds the exact device GPS coordinates and a secure timestamp directly into the EXIF data of the extracted .jpg frames before the Foreground Ping sends them to the cloud.

## 4. The Cloud AI Processing Pipeline
To ensure mobile responsiveness under poor network conditions, the AI backend strictly operates in a two-stage microservice architecture.

### Phase 1: Real-Time Vehicle Detection (The "Fast Ping")
This phase operates synchronously while the cop is still in the field, using minimal bandwidth.
- **Input:** The 1-FPS lightweight .jpg frames sent over mobile data.
- **The Model:** A highly optimized, single-stage object detector (e.g., YOLO11 or YOLOE) deployed on a cloud edge node.
- **The Execution:** The model scans the frame strictly to detect foundational classes (car, motorcycle, bus, truck, autorickshaw). It does not look for violations yet.
- **Output Payload:** It returns a lightweight JSON array back to the mobile app containing the unique Object IDs and their corresponding X/Y bounding box coordinates. This populates the "Swiggy Cart" UI for manual tagging.

### Phase 2: Deep Analysis & Rule Verification (Post-Wi-Fi Sync)
This phase triggers asynchronously only after the heavy .mp4 video has been uploaded via an unmetered Wi-Fi/5G connection. It feeds directly into the Admin Dashboard.

**A. ANPR (Automatic Number Plate Recognition) Sub-Pipeline:**
- **Localization:** A specialized YOLO model (fine-tuned on open-source Indian datasets like Roboflow's DataCluster Labs dataset of 20,000+ Indian plates) isolates and crops the license plate bounding box from the high-res video frames.
- **OCR Extraction:** The cropped image is passed to the Google Cloud Vision API (or a localized LPRNet). This handles the non-standardized fonts, regional languages, and broken plates common in Indian traffic, returning a raw text string (e.g., TS09EK1234).

**B. Static Violation Classification (Heuristics & Pre-trained Weights):**
Instead of training a monolithic AI, the system uses nested logic on pre-trained models (like the India Driving Dataset - IDD):
- **No Helmet:** A secondary YOLO classification model runs only inside the bounding boxes labeled motorcycle. It is trained strictly on helmet vs. bare_head datasets (available off-the-shelf on Roboflow Universe).
- **Triple Riding:** A standard YOLO person-detection model runs inside the motorcycle crop. If the person count > 2, the flag is triggered.
- **Wrong Side / Zebra Crossing:** A semantic segmentation model (e.g., YOLOv8-Seg) identifies the "drivable area" and "lane markings." The AI triggers a flag if the vehicle's trajectory vector opposes the lane flow, or if the vehicle's bounding box overlaps a zebra crossing polygon at zero speed.
*(Strict MVP Constraint: Dynamically calculated violations like "Overspeeding" and "Turning without indicator" are explicitly out of scope for this build, as mobile hardware VFR and lack of fixed reference points cannot guarantee the legal burden of proof).*

## 5. The Admin Arbitration Dashboard & RLHF Data Engine
This web-based dashboard is the core of the stakeholder pitch. It utilizes a Human-in-the-Loop (HITL) framework to judge the AI's accuracy and generate proprietary training data.

### A. The UI Layout
- **Top Overlay (ANPR Verification):** Displays the raw, cropped image of the license plate side-by-side with the AI-generated OCR text string. This allows the Admin to instantly verify or manually correct the vehicle registration number.
- **Bottom Matrix (Violation Arbitration):** A side-by-side comparison matrix.
  - Left Column: The violations manually tagged by the Traffic Cop in the field.
  - Right Column: The violations algorithmically detected by the Cloud AI.
  - Visual Sync: If both the Cop and the AI flag the same violation (e.g., "Signal Jumping"), the UI highlights that row in green (Consensus Match).
- **The Action Layer:** Every single violation listed has a granular [Approve] and [Reject] button.

### B. The RLHF Vault (Reinforcement Learning from Human Feedback)
This is the product's primary moat. The system does not retrain its neural weights dynamically in real-time. Instead, it acts as a structured Data Engine.
- **The Trigger:** When the Admin clicks [Approve] on an AI-detected violation (or a Cop-detected violation the AI missed).
- **The Action:** A backend script packages the cropped image, the bounding box coordinates, and the verified text label into a structured JSON payload.
- **The Vault:** This payload is pushed to a secure AWS S3 / Google Cloud Storage bucket named Verified_Training_Data.
- **The Value Proposition:** This automatically generates legally verified, highly localized, proprietary training data directly from daily police operations. This data pool is then used for secure, automated weekly retraining cycles to continuously improve the model's accuracy on Indian roads without manual data-labeling overhead.

## 6. Data Architecture & API Payloads (JSON Schemas)

### A. The Bounding Box Response (Cloud -> Mobile App)
```json
{
  "session_id": "sess_98765abc",
  "frame_timestamp": "2026-02-23T14:30:00Z",
  "detected_vehicles": [
    {
      "vehicle_id": "v_001",
      "class": "motorcycle",
      "bounding_box": {
        "x_min": 120,
        "y_min": 340,
        "x_max": 250,
        "y_max": 510
      },
      "confidence_score": 0.92
    }
  ]
}
```

### B. The Cop's Final Submission (Mobile App -> Cloud)
```json
{
  "officer_id": "cop_4451",
  "capture_session_id": "sess_98765abc",
  "gps_location": {
    "latitude": 17.3850,
    "longitude": 78.4867
  },
  "video_reference": "local_uri://videos/challan_98765abc.mp4",
  "manual_tags": [
    {
      "vehicle_id": "v_001",
      "flagged_violations": ["no_helmet", "wrong_side_driving"]
    }
  ],
  "timestamp": "2026-02-23T14:32:15Z"
}
```

### C. The RLHF Vault Entry (Admin -> Storage Bucket)
```json
{
  "admin_id": "adm_099",
  "verified_timestamp": "2026-02-24T09:15:00Z",
  "source_video_id": "sess_98765abc",
  "verified_license_plate": "TS09EK1234",
  "verified_violation": "no_helmet",
  "training_assets": {
    "cropped_image_url": "s3://training-vault/crops/ts09ek1234_nohelmet.jpg",
    "bounding_box": { "x_min": 120, "y_min": 340, "x_max": 250, "y_max": 510 }
  },
  "consensus_match": true
}
```

## 7. Recommended Tech Stack Summary (For Implementation)
- **Mobile Client:** React Native or Flutter (strictly using native background thread modules for media processing).
- **Local Mobile Database:** WatermelonDB (React Native) or ObjectBox/Realm (Flutter) for high-performance offline state management.
- **Background Sync:** WorkManager (Android) / BGTaskScheduler (iOS).
- **Cloud Backend/API:** Python with FastAPI (for lightning-fast ML model serving and asynchronous endpoint handling).
- **AI Models:**
  - Vehicle/Person Detection: YOLO11 / YOLOE.
  - ANPR & OCR: Roboflow Indian License Plate pre-trained weights + Google Cloud Vision API.
- **Cloud Storage:** AWS S3 or Google Cloud Storage (for raw videos and the RLHF Vault).

## 8. Execution Milestones (Order of Operations)
To ensure a working build for the demo, build the components in this strict order:
1. **Milestone 1 (The Engine):** Build the headless frame extractor and local SQLite database logic. Test with dummy .mp4 files via CLI before touching the UI.
2. **Milestone 2 (The AI Mockup):** Build the FastAPI endpoints. Connect the Google Cloud Vision API and a basic pre-trained YOLO model just to prove bounding box generation works.
3. **Milestone 3 (The App UI):** Connect Figma designs to the headless engine (Milestone 1). Ensure the camera opens instantly and the "Swiggy Cart" checklist populates dynamically.
4. **Milestone 4 (The Admin Dashboard):** Build a simple React/Next.js web view to display the JSON outputs from Milestone 2 next to the manual tags from Milestone 3. Wire up the [Approve] button to dump data into the RLHF JSON format.
