# NexusOps

A centralized AI operations platform built for Prozo's Entrepreneur in
Residence (Agentic AI) take-home case study. Three independent case-study
modules run behind one shared frontend shell, one Node.js API gateway, and
shared backend services — each module registers itself without modifying
the others.

## Case studies — start here

| # | Module | Status | README |
|---|---|---|---|
| 1 | Parcel Image Intelligence | Active | [docs/parcel-image-intelligence.md](docs/parcel-image-intelligence.md) |
| 2 | Employee Compliance Verification (PF/ESIC vs. wagesheet) | Active | [docs/employee-compliance-verification.md](docs/employee-compliance-verification.md) |
| 3 | FC Financial Monitor (daily P&L, anomalies, alerts) | Active | [docs/fc-financial-monitor.md](docs/fc-financial-monitor.md) |

Each module's own README has the full "run locally in under 15 minutes"
steps, approach and rationale, known limitations, and what would be
improved with more time. The steps below are the *shared* setup — do them
once, then open whichever module's README you want to exercise.

## Shared setup (one-time, ~10 minutes)

```bash
git clone <this-repo-url> && cd ai-hub

# 1) MongoDB — pick ONE, both free, no paid tier needed:
#    a) local: brew install mongodb-community && brew services start mongodb-community
#    b) cloud: a free MongoDB Atlas M0 cluster (mongodb.com/cloud/atlas/register)

# 2) Env files
cp backend/node-api/.env.example backend/node-api/.env
cp backend/python-ai/.env.example backend/python-ai/.env
cp frontend/.env.example frontend/.env
# Fill in MONGODB_URI in both backend .env files, and a random JWT_SECRET
# in backend/node-api/.env (the file has a one-liner to generate one).
# Everything else has a working default — Gemini is optional, see
# docs/parcel-image-intelligence.md.

# 3) Install dependencies
cd backend/node-api && npm install && cd ../..
cd frontend && npm install && cd ..
cd backend/python-ai && python3 -m venv .venv && source .venv/bin/activate \
  && pip install -r requirements.txt && cd ../..

# 4) Create the first login (safe to re-run)
cd backend/node-api && node scripts/seedAdmin.js you@example.com yourpassword123 && cd ../..

# 5) Start all three services (3 terminals)
cd backend/python-ai && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
cd backend/node-api && node src/server.js
cd frontend && npm run dev
```

Sign in at `http://localhost:5173` and pick a module from the sidebar.
Sample input files for all three case studies are under `test-data/`, and
sample outputs produced from them are under `test-data/sample-outputs/`.

## No paid API keys required

Every module works end-to-end for free:

- **MongoDB**: local install or Atlas's free M0 tier.
- **Parcel Image Intelligence**: Tesseract OCR (free, local, primary path)
  with an *optional* Gemini vision fallback (free tier, no cost — see its
  README for the tight daily quota to expect).
- **Employee Compliance Verification**: pure PDF/Excel parsing
  (`pdfplumber`/`pandas`/`rapidfuzz`) — no external API calls at all.
- **FC Financial Monitor**: pure rule-based calculation — no external API
  calls at all. Alert delivery (Slack/email) is optional and uses free
  incoming webhooks / any SMTP account you already have.

## Architecture

```
React (frontend)  →  Node.js + Express (orchestration, auth, shared services)
                          →  Python FastAPI (AI/document processing)
                                  →  MongoDB (shared)
```

Each module's async work (a PDF batch, an image batch, a financial upload)
runs as a FastAPI `BackgroundTask` writing progress to a shared `Job`
document in MongoDB — the upload request returns immediately, the frontend
polls for progress, and a user can navigate away and come back to see the
result without anything freezing. There is no Celery/Redis in this
project: an earlier scaffold for it was removed since every module's
actual processing load fits comfortably in-process (see each module's
README for the explicit tradeoff).

## Authentication

Every API route except `/api/auth/login` requires a valid JWT (see
`backend/node-api/src/middleware/requireAuth.js`). The frontend attaches it
automatically; image/CSV/report URLs that load via a plain `<img>`/`<a>` tag
(which can't carry a header) pass it as a `?token=` query param instead —
same verification, different transport.

There's no public registration — create the first account with:

```bash
cd backend/node-api
node scripts/seedAdmin.js <email> <password> [name]
```

Safe to re-run; it does nothing if that email already has an account.

## Structure

```
frontend/        React + Vite + Tailwind SPA (one module folder per case study)
backend/node-api/    Express API gateway + shared services (auth, jobs, uploads, reports)
backend/python-ai/   FastAPI AI/document-processing engine (one module folder per case study)
uploads/             Local file storage (dev; gitignored — runtime data, not source)
test-data/           Sample input files AND sample outputs for all three case studies (tracked)
docs/                One README per case study, written for this submission
```

## Testing

```bash
cd backend/python-ai && source .venv/bin/activate
pytest app/ -v   # 127 tests across all three modules
```

See each module's README for test counts and what's covered.
