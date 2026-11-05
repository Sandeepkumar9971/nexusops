import numpy as np
import pytesseract

from app.modules.parcel_intelligence import pipeline


def test_unreadable_file_fails_cleanly_not_a_crash(tmp_path):
    bad_path = tmp_path / "not_an_image.jpg"
    bad_path.write_bytes(b"this is not a real image")
    result = pipeline.run_detection_pipeline(str(bad_path))
    assert result["status"] == "FAILED"
    assert "Could not read image file" in result["errorReason"]


def test_missing_file_fails_cleanly_not_a_crash(tmp_path):
    result = pipeline.run_detection_pipeline(str(tmp_path / "does_not_exist.jpg"))
    assert result["status"] == "FAILED"


def _fake_image(tmp_path, name="fake.jpg"):
    import cv2

    arr = np.zeros((200, 200, 3), dtype=np.uint8)
    path = tmp_path / name
    cv2.imwrite(str(path), arr)
    return str(path)


def test_tesseract_not_found_reports_ocr_unavailable_not_a_crash(tmp_path, monkeypatch):
    path = _fake_image(tmp_path)

    def _raise_not_found(_image):
        raise pytesseract.TesseractNotFoundError()

    monkeypatch.setattr(pipeline, "run_ocr_on_image", _raise_not_found)
    monkeypatch.setattr(pipeline, "extract_with_gemini", lambda _bytes: {})
    monkeypatch.setattr(pipeline, "gemini_is_configured", lambda: False)

    result = pipeline.run_detection_pipeline(path)
    assert result["status"] == "NEEDS_REVIEW"
    assert result["extractionMethod"] == "ocr_unavailable"
    assert "Tesseract is not installed" in result["errorReason"]


def test_low_confidence_ocr_with_no_gemini_key_is_needs_review_not_a_crash(tmp_path, monkeypatch):
    """The bug this guards against: with GEMINI_API_KEY unset, the pipeline
    used to propagate an unhandled exception from the Gemini fallback. It
    must now report a clean NEEDS_REVIEW explaining the key is optional."""
    path = _fake_image(tmp_path)

    monkeypatch.setattr(pipeline, "run_ocr_on_image", lambda _image: {"rawText": "", "confidence": 0.0})
    monkeypatch.setattr(pipeline, "extract_with_gemini", lambda _bytes: {})
    monkeypatch.setattr(pipeline, "gemini_is_configured", lambda: False)

    result = pipeline.run_detection_pipeline(path)
    assert result["status"] == "NEEDS_REVIEW"
    assert result["extractionMethod"] == "tesseract"
    assert "GEMINI_API_KEY is not configured" in result["errorReason"]


def test_successful_ocr_above_threshold_skips_gemini_entirely(tmp_path, monkeypatch):
    path = _fake_image(tmp_path)
    overlay_text = "AWB: 123456\nWEIGHT: 2.5kg\n"

    gemini_calls = []
    monkeypatch.setattr(pipeline, "run_ocr_on_image", lambda _image: {"rawText": overlay_text, "confidence": 95.0})
    monkeypatch.setattr(pipeline, "extract_with_gemini", lambda _bytes: gemini_calls.append(1) or {})

    result = pipeline.run_detection_pipeline(path)
    assert result["status"] == "DETECTED"
    assert result["extractionMethod"] == "tesseract"
    assert gemini_calls == []  # never called — OCR already found the critical fields


def test_gemini_fallback_result_replaces_shaky_ocr_fields(tmp_path, monkeypatch):
    path = _fake_image(tmp_path)

    monkeypatch.setattr(pipeline, "run_ocr_on_image", lambda _image: {"rawText": "", "confidence": 10.0})
    monkeypatch.setattr(
        pipeline,
        "extract_with_gemini",
        lambda _bytes: {"awb": "999", "weight": 3.1, "location": "A-1", "length": None, "width": None, "height": None, "volume": None, "timestamp": None, "sorterId": None},
    )
    monkeypatch.setattr(pipeline, "gemini_is_configured", lambda: True)

    result = pipeline.run_detection_pipeline(path)
    assert result["status"] == "DETECTED"
    assert result["extractionMethod"] == "gemini"
    assert result["fields"]["awb"] == "999"
    assert result["fields"]["weight"] == 3.1
