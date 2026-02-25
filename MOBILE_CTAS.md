# Mobile App CTAs (Exhaustive List)

This document contains the exhaustive set of clickable buttons and UI interactions (CTAs) required for the DTRS Mobile App, based on the finalized UI/UX flow.

## 1. Authentication / Sign-In Screen
*   **[Sign In]**
    *   **Action:** Authenticates the officer and navigates to the Camera screen.
*   **[Log in with Fingerprint / FaceID]**
    *   **Action:** Triggers the native device biometric authentication prompt.
*   **[Stay Signed In (Checkbox)]**
    *   **Action:** Toggles persistent session state.

## 2. Main Camera Screen (Center Pane)
*   **[Record Button (Shutter)]**
    *   **Action:** Tap to record video, hold to record (Snapchat style). Release to stop.
*   **[Swipe Up/Down on Record Button (Gesture)]**
    *   **Action:** Smoothly controls optical/digital zoom while recording.
*   **[Swipe Right (Gesture)]**
    *   **Action:** Opens the Left Pane (Stats & Settings).
*   **[Swipe Left (Gesture)]**
    *   **Action:** Opens the Right Pane (Files/Pending Uploads).
*   **[Drafts Counter (e.g., "Drafts: X/10")]**
    *   **Action:** Tap to manually open the Right Pane (Files).
*   **[Open Review Drawer (Lockout Overlay Button)]**
    *   **Action:** Forces the user to the Right Pane when the 10-challan limit is hit.

## 3. Left Pane: Stats & Settings
### 3.1 Stats Section (Top)
*   *(Note: The 4 tiles - "Challans Reported", "Pending Approval", "Accuracy", and "Leaderboard" are primarily informational, but may have tap interactions to view details).*

### 3.2 Settings Section (Bottom)
*   **[Account / Private Information]**
    *   **Action:** Opens officer profile details.
*   **[Posting]**
    *   **Action:** Opens posting location/jurisdiction settings.
*   **[Contact Customer Support]**
    *   **Action:** Launches support/help flow.
*   **[Give Feedback]**
    *   **Action:** Opens a feedback form.

## 4. Right Pane: Files & Review
### 4.1 Pending Uploads List
*   **[Video Thumbnail Item]**
    *   **Action:** Tapping a pending video starts playing the video and opens the "Tagging Mode" for that specific video.

### 4.2 Tagging Mode (Inside a playing video)
*   **[Swipe Up (Gesture)]**
    *   **Action:** Reveals the vehicles identified by the system.
*   **[Vehicle Thumbnail Crop]**
    *   **Action:** Tapping a vehicle identified by the automated system selects it and expands its violation checklist (Swiggy Add-on style).
*   **[Vehicle Not Detected / Add Vehicle]**
    *   **Action:** Fallback button if detection missed a violator. Opens manual entry.
*   **[Violation Tag Checkboxes (Multi-Select)]**
    *   *Context: Appears under the selected vehicle.*
    *   **Options:** Parking beyond zebra crossing, Wrong side driving, Signal jumping, Over speeding (Note: Re-evaluate per PRD), 2-wheeler - Not wearing helmet, More than 2 people on bike, Not wearing belt, Using mobile phone, Tinted glass, Parked along roadside.
    *   **Action:** Toggles the specific violation for the selected vehicle.
*   **[Add Description (Text Input)]**
    *   **Action:** Allows the officer to type manual context (e.g., "Fled the scene").
*   **[Submit / Ready for Upload]**
    *   **Action:** Confirms tags, closes tagging mode, and moves the video to the "Uploads" queue (ready for Wi-Fi/Data sync).

## 5. Extreme Right Pane: Learn
*   **[Learn Traffic Rules Section]**
    *   **Action:** Opens a section displaying examples of traffic rule violations and educational content to help the officer understand infractions.