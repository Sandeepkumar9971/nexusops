# Parcel Image Intelligence (Case Study 1)

Extracts the structured fields burned into a warehouse parcel photo's text
overlay — AWB number, location, weight, dimensions, volume, timestamp, and
sorter ID — from a batch of images, with every record reviewable and
exportable, so a warehouse floor team doesn't have to key these fields in
by hand from a photo.

## Run locally in under 15 minutes

```bash
git clone <this-repo-url> && cd ai-hub

# 1) MongoDB — pick ONE, both free:
#    a) local: brew install mongodb-community && brew services start mongodb-community
#    b) cloud: a free MongoDB Atlas M0 cluster (https://www.mongodb.com/cloud/atlas/register)

# 2) Env files — copy the examples and fill in MONGODB_URI (Gemini key is optional, see below)
cp backend/node-api/.env.example backend/node-api/.env
cp backend/python-ai/.env.example backend/python-ai/.env
cp frontend/.env.example frontend/.env

# 3) Install dependencies
cd backend/node-api && npm install && cd ../..
cd frontend && npm install && cd ..
cd backend/python-ai && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cd ../..

# 4) Free local OCR engine (the PRIMARY extraction path — no API key needed)
brew install tesseract        # macOS; apt-get install tesseract-ocr on Linux

# 5) Create the first login
cd backend/node-api && node scripts/seedAdmin.js you@example.com yourpassword123 && cd ../..

# 6) Start all three services (3 terminals)
cd backend/python-ai && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
cd backend/node-api && node src/server.js
cd frontend && npm run dev
```

Sign in at `http://localhost:5173`, open **Parcel Image Intelligence**, and
upload a batch of parcel photos (sample images at
`test-data/samples/`) to get started.

## Approach and why

**Two-stage extraction, cheapest path first.** Every image is cropped to
its overlay region, OCR'd with Tesseract (free, local, no API key, no
network call), and the OCR text is parsed with a field-specific regex
parser (`extraction/overlay_parser.py`) that understands the overlay's
packed encodings (e.g. a dimension code like `L0189XH0145XW0119` is
millimetres with leading zeros; a bare 17-digit string is a packed
`YYYYMMDDHHMMSSmmm` timestamp). **Gemini vision is only called as a
fallback** — when OCR confidence is below 70% or the two fields that
matter most (AWB, weight) are still missing — never on every image, to
keep the system genuinely usable with zero paid API calls. This ordering
(local-first, cloud-fallback-only-when-needed) is the core design
decision: a reviewer running with no `GEMINI_API_KEY` configured still
gets full extraction on every image Tesseract can read cleanly, and a
clearly-flagged `NEEDS_REVIEW` (never a crash) on the ones it can't.

**Overlay-region detection is resolution-relative, not resolution-fixed.**
A fixed-percentage crop region works differently on an 8K photo than on a
phone-camera photo, so `detection/overlay_region.py` instead detects the
overlay by its two known text colors (bright yellow / bright white against
a sparse-text pixel-density check) rather than a fixed pixel box — see
Known Limitations for where this still has edges.

**Async by design.** A batch is a `Job` (the same shared model every
module in this platform uses) processed by a FastAPI `BackgroundTask` —
the upload request returns immediately, the frontend polls for progress,
and the active job ID is persisted to `localStorage`
(`ParcelIntelligencePage.jsx`), so navigating away and back still shows
live progress or the finished results, never a frozen tab.

## Required output

| Output | Where |
|---|---|
| Per-image status (`DETECTED` / `NEEDS_REVIEW` / `FAILED`) with a plain-language reason when not detected | Results table + `GET /jobs/:jobId/results` |
| Extracted fields: AWB, Location, Weight, Length/Width/Height, Volume, Timestamp, Sorter ID | `fields` on each result (`schemas`/`overlay_parser.py:111-120`) |
| Which extraction method actually produced the result (`tesseract` / `gemini` / `ocr_unavailable`) + OCR confidence | Shown per-row, exported too |
| Downloadable batch report | `GET /jobs/:jobId/export.csv` — filename, status, all extracted fields, extraction method, OCR confidence, error reason |

## Free-tier path (what a reviewer with zero API keys gets)

- **Tesseract OCR** is 100% local and free — no account, no key, no
  network call, no rate limit. It is the primary path, not a fallback.
- **Gemini is entirely optional.** With no `GEMINI_API_KEY` set, the
  module no longer errors (see Known bug fixed, below) — it simply skips
  the fallback and reports `NEEDS_REVIEW` with an explicit reason
  ("...GEMINI_API_KEY is not configured — this is expected on a free,
  no-API-key setup...") for the images OCR alone couldn't read.
- If you do want the fallback: get a free key at
  [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
  Google's free tier is real but tight — expect as low as **~20
  requests/day** on some models; `GEMINI_MODEL` defaults to the `-latest`
  alias so it keeps routing to whichever model currently has free-tier
  capacity rather than a dated SKU that can return persistent `503`s.

## Known bug fixed during review

`extract_with_gemini()` used to construct the Gemini client (reading
`GEMINI_API_KEY`) **outside** its own try/except, so a missing key raised
an unhandled `ValueError` straight out of the pipeline — a batch run with
no Gemini key configured at all would fail on the first image that needed
the fallback, which directly contradicted "runs without paid API keys."
Fixed: a missing or invalid key now degrades to the same clean `{}`
("still couldn't extract") result as any other Gemini failure — see
`extraction/gemini_extractor.py`'s `is_configured()` / the try/except
around client creation.

## Sample test images

`test-data/samples/` — eleven real parcel overlay photos covering several
label schemes (handwritten-style yellow overlay, a monospace white
overlay, packed-format dimension/weight/timestamp encodings). Six of them
(`1_jpeg...`, `6_jpeg...`, `7_jpeg...`, `8_jpeg...`, `9_jpeg...`,
`ms31_jpeg...`) are the exact batch behind
`test-data/sample-outputs/parcel-image-intelligence-output.csv` — upload
that same set to reproduce it: all six come back `DETECTED` via the
Gemini fallback (`ms31` with `weight` left `null`, since its overlay never
stated one — never invented, per the "null, not a guess" rule in
`overlay_parser.py`). The other five (`sample1`–`sample5`) demonstrate
different schema variations for the primary Tesseract path once it's
installed.

## Known limitations

- **Overlay detection assumes one of two text colors** (bright yellow or
  bright white, `detection/overlay_region.py`) — a third overlay color
  scheme would not be found by the current detector and would need a new
  color rule added.
- **Two detection thresholds are absolute pixel counts, not
  resolution-scaled** (`GAP_THRESHOLD_PX=100`, `BOTTOM_PADDING_PX=25`) —
  while the crop region itself scales with image size, these two
  constants don't, so a much higher- or lower-resolution batch than the
  samples tested here could need re-tuning.
- **Gemini free-tier quota is small** (as low as ~20 requests/day on some
  models) — a large batch relying heavily on the fallback could exhaust it
  mid-run; Tesseract-only extraction has no such limit.
- **No Celery/background queue** — processing runs as a FastAPI
  `BackgroundTask` in-process, consistent with the rest of the platform's
  current (pre-Redis) state.

## What I'd improve with more time

- A small manifest documenting which sample image is expected to produce
  a clean `DETECTED`, a `NEEDS_REVIEW`, and (synthetically) a `FAILED`
  outcome, for faster regression checking.
- A third/fourth overlay color rule, or a more general "high-saturation,
  sparse-density" detector not hardcoded to two specific colors.
- Scale the two absolute-pixel detection constants by image
  resolution instead of leaving them fixed.
- Surface the Gemini daily-quota exhaustion explicitly in the UI (right
  now it's indistinguishable from any other Gemini failure in the
  per-image reason text; the server log has more detail than the UI does).

## Testing

```bash
cd backend/python-ai
source .venv/bin/activate
pytest app/modules/parcel_intelligence/tests/ -v
```
