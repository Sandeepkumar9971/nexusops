import os

import cv2
import pytesseract

from app.modules.parcel_intelligence.detection.overlay_region import crop_overlay_region
from app.modules.parcel_intelligence.extraction.gemini_extractor import extract_with_gemini, is_configured as gemini_is_configured
from app.modules.parcel_intelligence.extraction.overlay_parser import parse_overlay_text
from app.modules.parcel_intelligence.ocr.tesseract_ocr import run_ocr_on_image

# Below this OCR confidence, or when OCR couldn't find the fields that
# actually matter, fall back to Gemini reading the image directly.
CONFIDENCE_THRESHOLD = 70.0
CRITICAL_FIELDS = ("awb", "weight")


def _missing_critical_fields(fields: dict) -> bool:
    return all(fields.get(key) is None for key in CRITICAL_FIELDS)


def run_detection_pipeline(image_path: str) -> dict:
    """Crops the known overlay region -> OCRs it -> parses it. Falls back to
    Gemini (image understanding) when OCR confidence is low or the critical
    fields (AWB, weight) are still missing — never when OCR already
    succeeded, to avoid unnecessary API cost and latency."""
    filename = os.path.basename(image_path)

    image = cv2.imread(image_path)
    if image is None:
        return {"filename": filename, "status": "FAILED", "errorReason": f"Could not read image file: {image_path}"}

    overlay_crop = crop_overlay_region(image)
    encoded_ok, buffer = cv2.imencode(".jpg", overlay_crop)
    crop_bytes = buffer.tobytes() if encoded_ok else None

    # Tesseract being missing entirely is a different fact from "Tesseract
    # ran and found nothing" — the former means OCR never actually got a
    # chance, the latter means the overlay itself was unreadable. Both used
    # to collapse into the same 0%-confidence result, which then mislabeled
    # the record as extractionMethod "tesseract" even though no OCR ever
    # ran — actively misleading when the image is perfectly legible and the
    # real cause was the server's Tesseract installation.
    tesseract_unavailable = False
    try:
        ocr_result = run_ocr_on_image(overlay_crop)
    except pytesseract.TesseractNotFoundError:
        tesseract_unavailable = True
        ocr_result = {"rawText": "", "confidence": 0.0}
    except Exception:  # noqa: BLE001 - any other OCR failure should fall
        # through to Gemini too, not crash the whole image.
        ocr_result = {"rawText": "", "confidence": 0.0}

    fields = parse_overlay_text(ocr_result["rawText"])
    extraction_method = "ocr_unavailable" if tesseract_unavailable else "tesseract"

    needs_fallback = ocr_result["confidence"] < CONFIDENCE_THRESHOLD or _missing_critical_fields(fields)
    gemini_attempted = False

    if needs_fallback and crop_bytes:
        gemini_attempted = True
        gemini_fields = extract_with_gemini(crop_bytes)
        if gemini_fields:
            # Gemini's result replaces the shaky OCR parse wholesale rather
            # than merging field-by-field — mixing a low-confidence OCR
            # read with a confident model read risks a Frankenstein record.
            fields = {
                **{key: None for key in fields if key != "raw"},
                **gemini_fields,
                "raw": fields.get("raw", {}),
            }
            extraction_method = "gemini"

    base = {
        "filename": filename,
        "ocrConfidence": ocr_result["confidence"],
        "rawOcrText": ocr_result["rawText"],
        "extractionMethod": extraction_method,
        "fields": fields,
    }

    if _missing_critical_fields(fields):
        if extraction_method == "ocr_unavailable":
            reason = (
                "OCR is unavailable on this server (Tesseract is not installed), and the Gemini fallback "
                "could not extract AWB/weight either"
                if gemini_attempted
                else "OCR is unavailable on this server (Tesseract is not installed), and no fallback was attempted."
            )
        elif gemini_attempted:
            if gemini_is_configured():
                reason = "Could not extract AWB/weight from the overlay, even after the Gemini fallback (see server logs for the specific API error)."
            else:
                reason = (
                    "Could not extract AWB/weight from the overlay. The Gemini fallback was not used because "
                    "GEMINI_API_KEY is not configured — this is expected on a free, no-API-key setup; add a "
                    "free Gemini API key to enable the fallback for low-quality overlays."
                )
        else:
            reason = "Could not extract AWB/weight from the overlay."
        return {**base, "status": "NEEDS_REVIEW", "errorReason": reason}

    return {**base, "status": "DETECTED", "errorReason": None}
