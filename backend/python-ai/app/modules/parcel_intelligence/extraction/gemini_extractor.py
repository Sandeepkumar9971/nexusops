import json
import logging
import os
import time

from google import genai
from google.genai import types
from google.genai.errors import ClientError

logger = logging.getLogger(__name__)

_client = None

# Overridable via env since the free tier's per-model daily quota (as low
# as 20 requests/day) means switching models is sometimes the only way to
# keep working once one model's quota is exhausted for the day. Defaults to
# the "-latest" alias rather than a dated model SKU: a pinned model like
# "gemini-3.1-flash-lite" was observed returning persistent 503 UNAVAILABLE
# ("high demand") across many consecutive calls, while "-latest" is Google's
# own alias for whichever current model has serving capacity — switching to
# it immediately fixed extraction for an image that had failed repeatedly.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")

EXTRACTION_PROMPT = """You are reading a warehouse parcel photo. In the top-left
corner there is a small text overlay burned into the image with fields such as
Location, an AWB or Barcode number, dimensions, weight, and a timestamp.
Read ONLY that overlay text — ignore any separate printed shipping label
elsewhere in the photo. Return a single JSON object with exactly these keys:

{
  "location": string or null,
  "awb": string or null,
  "length": number in centimetres or null,
  "width": number in centimetres or null,
  "height": number in centimetres or null,
  "weight": number in kilograms or null,
  "volume": number in cubic centimetres or null,
  "timestamp": string in ISO 8601 format or null,
  "sorterId": string or null
}

Some overlays encode values in a packed format rather than plain units —
apply these conversions, don't just copy the raw digits:
- A combined dimension code like "L0189XH0145XW0119" is length/height/width
  in MILLIMETRES with leading zeros — divide each by 10 to get centimetres
  (0189 -> 18.9, 0145 -> 14.5, 0119 -> 11.9).
- A bare weight integer with no decimal point and no unit letters (e.g.
  "00580") is in GRAMS — divide by 1000 to get kilograms (00580 -> 0.58).
- A packed timestamp of 17 digits (e.g. "20250628225212666") is
  YYYYMMDDHHMMSSmmm — convert to ISO 8601.
If a field already has an explicit unit (e.g. "36.3 cm", "0.39 kg"), use the
number as given — do not reapply these conversions to it.

If a field is not present in the overlay, use null — never guess or invent a
value. Respond with ONLY the JSON object, no markdown fences, no explanation."""


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(
            api_key=os.getenv("GEMINI_API_KEY"),
            http_options=types.HttpOptions(timeout=30_000),  # fail fast rather than hang
        )
    return _client


MAX_ATTEMPTS = 3
RETRY_DELAY_SECONDS = 2


def is_configured() -> bool:
    """Whether a Gemini API key is present at all. The free Tesseract OCR
    path above this in the pipeline never depends on this — a reviewer
    running with zero Gemini key still gets full OCR-based extraction,
    just without this fallback for the images OCR can't read."""
    return bool(os.getenv("GEMINI_API_KEY"))


def extract_with_gemini(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """Fallback extractor for when Tesseract's confidence is too low (<70%)
    or it fails to find the fields we need. Returns {} on any failure —
    callers treat that the same as "still couldn't extract", never as a
    reason to invent values. Every failure is logged server-side (even
    though the caller only sees {}) so the real cause — quota exhaustion,
    an outage, a parsing miss — is always diagnosable.

    Retries a few times on transient server overload (observed ~25% of
    calls hitting 503/504 under current API load) before giving up. Client
    creation itself is inside the same guard as the API calls — an invalid
    or missing key must degrade to {} like any other failure, never raise
    out of this function (a caller with no Gemini key configured at all
    must still get a clean result, not a crash).
    """
    if not is_configured():
        logger.info("Gemini fallback skipped: GEMINI_API_KEY is not configured.")
        return {}
    try:
        client = _get_client()
    except Exception as exc:  # noqa: BLE001 - a bad/malformed key, SDK init
        # failure, etc. must degrade exactly like any other Gemini failure.
        logger.warning("Gemini client could not be initialized (model=%s): %s", GEMINI_MODEL, exc)
        return {}
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[
                    {
                        "parts": [
                            {"text": EXTRACTION_PROMPT},
                            {"inline_data": {"mime_type": mime_type, "data": image_bytes}},
                        ]
                    }
                ],
                config={"response_mime_type": "application/json"},
            )
            return json.loads(response.text)
        except ClientError as exc:
            # e.g. 429 quota exceeded, 400 bad request — retrying identically won't help.
            logger.warning("Gemini client error (model=%s): %s", GEMINI_MODEL, exc)
            return {}
        except Exception as exc:  # noqa: BLE001 - server overload (ServerError), timeouts,
            # connection errors, and response-parsing failures are all treated as transient.
            logger.warning("Gemini extraction error on attempt %d/%d (model=%s): %s", attempt, MAX_ATTEMPTS, GEMINI_MODEL, exc)
            if attempt < MAX_ATTEMPTS:
                time.sleep(RETRY_DELAY_SECONDS)
                continue
            return {}
    return {}
