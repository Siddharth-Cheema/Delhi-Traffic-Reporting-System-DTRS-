# Backend App Test Findings

## Scope

- Audited `apps/api-service` (`celery_worker.py` and `app/ml` scripts).
- Initial review focused on memory leaks, exception handling, and metadata injection integrity.
- Fixed the identified flaws.

## Findings & Resolutions

1.  **Memory Leaks in Inference Engine:**
    *   **Issue:** `app/ml/yolo_inference.py` lacked explicit cleanup of large arrays resulting from `cv2.dnn.NMSBoxes` and ONNX inference operations, which could lead to memory ballooning when processing heavy queues via Celery.
    *   **Resolution:** Added explicit `del` statements for large arrays (`tensor`, `output_tensor`, `preds`) in `yolo_inference.py`.

2.  **Resource Leaks in OCR and EXIF scripts:**
    *   **Issue:** `app/ml/ocr.py` didn't close the file descriptor if an exception was raised while reading an image file in `perform_ocr()`. Similarly, `app/ml/exif_injector.py` didn't explicitly close the `PIL.Image` file descriptor.
    *   **Resolution:** Added `finally` blocks to explicitly call `.close()` on `image_file` in `ocr.py` and `im` in `exif_injector.py` to prevent file descriptor leaks.

3.  **Missing Exception Handling:**
    *   **Issue:** `app/celery_worker.py` called `fast_yolo_engine.infer()` and `ocr_engine.perform_ocr()` without proper `try-except` blocks, risking worker process crashes on ML engine failures.
    *   **Resolution:** Wrapped inference and OCR calls in `try-except` blocks in `celery_worker.py` to allow the worker to continue gracefully and assign fallback/error values.

4.  **Improper Temporary File Cleanup:**
    *   **Issue:** `app/celery_worker.py` created temporary crop images for OCR (`cv2.imwrite(crop_path, frame)`) but never deleted them.
    *   **Resolution:** Added a cleanup block to remove the temporary `crop_path` file after OCR is complete (in a `finally` block).

5.  **Malformed Metadata Handling:**
    *   **Issue:** `app/ml/exif_injector.py` handled `None` values for lat/lng, but it did not cleanly handle instances where lat/lng were passed as non-float-convertible strings or types, which would crash `_to_deg`.
    *   **Resolution:** Implemented robust `try-except` casting for `lat` and `lng` to `float`, falling back to `0.0` if a `ValueError` or `TypeError` is raised.

## Category Health Summary

The **Backend and Data Processing** category is **Healthy**.

The components (`yolo_inference.py`, `ocr.py`, `exif_injector.py`) are now defensively programmed against malformed data, and memory/resource leaks have been mitigated. The Celery worker script is now robust against engine exceptions and cleans up its temporary filesystem usage, ensuring stable long-term background processing.