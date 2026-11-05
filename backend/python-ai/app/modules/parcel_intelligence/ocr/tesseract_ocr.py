import cv2
import pytesseract


def run_ocr_on_image(image) -> dict:
    """Runs Tesseract on an in-memory BGR image (the cropped overlay region)
    and returns raw text plus an overall confidence score (mean word-level
    confidence, ignoring the -1 entries Tesseract emits for non-text
    regions).

    The overlay is bright yellow/white text on a near-black background —
    the opposite of a typical scanned document. THRESH_BINARY_INV flips
    that to the dark-text-on-light-background polarity Tesseract is
    actually trained on.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresholded = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    raw_text = pytesseract.image_to_string(thresholded)
    data = pytesseract.image_to_data(thresholded, output_type=pytesseract.Output.DICT)

    confidences = []
    for value in data.get("conf", []):
        try:
            score = float(value)
        except (TypeError, ValueError):
            continue
        if score >= 0:
            confidences.append(score)

    avg_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.0

    return {"rawText": raw_text.strip(), "confidence": avg_confidence}
