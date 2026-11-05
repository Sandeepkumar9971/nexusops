# Employee Compliance Verification

Automates a manual, error-prone payroll compliance check: confirming that the
PF (Provident Fund) and ESIC (Employee State Insurance) contributions a
vendor *deducted* from employee wages in their wagesheet were actually
*deposited* with the government, by cross-referencing the wagesheet against
the vendor's own PF ECR and ESIC ECR filings.

## Problem statement

A vendor submits a monthly wagesheet listing each employee's PF and ESIC
deductions. Separately, the vendor files an ECR (Electronic Challan cum
Return) with EPFO (for PF) and with ESIC, which is the authoritative record
of what was actually remitted to the government on each employee's behalf.
These two documents can disagree — a deducted amount never remitted, a name
typo that silently drops an employee from matching, a contribution short by
a few rupees — and reconciling them by hand across a hundred-plus row
wagesheet and a multi-page government PDF is slow and easy to get wrong.
This module automates that reconciliation and flags every discrepancy for
review instead of requiring someone to eyeball three documents side by side.

## Architecture

Reuses the existing NexusOps platform end to end — no separate app, no
separate auth, no separate job/report infrastructure:

```
React (frontend)                    POST /api/employee-compliance/batches
  ComplianceUploadWorkspace    →     (Node API, shared Job model)
  ComplianceProcessingPanel               │
  EmployeeResultsTable                    ▼ fire-and-forget
  EmployeeDetailDrawer          POST /process-compliance-batch
                                     (Python FastAPI, BackgroundTasks)
                                               │
                        parse → match → verify → persist → report
                                               │
                        MongoDB: jobs, compliance_employee_results, reports
```

- **Frontend**: `frontend/src/modules/employee-compliance/` — a module folder
  following the same shape as `parcel-intelligence`, using the platform's
  shared `Button`/`Card`/`DataTable`/`StatusBadge`/`KpiCard` components.
- **Node API**: `backend/node-api/src/modules/employee-compliance/` — creates
  the shared `Job` document (not a separate collection), stores the three
  uploaded files, and hands off to Python. Reads results from
  `ComplianceEmployeeResult` (Node never writes to it — Python owns that).
- **Python AI**: `backend/python-ai/app/modules/employee_compliance/` — all
  parsing, matching, verification and report generation. Runs as a
  `BackgroundTasks` job (no Celery/Redis — deliberately deferred per current
  project priorities), writing progress directly to the shared `Job`
  document's `currentStage`/`processedRecords`/etc. fields as it goes.

### Why the shared `Job` model instead of a dedicated collection

An earlier design sketch suggested a standalone `ComplianceBatch` collection.
Since this module's "batch" is conceptually identical to a Parcel
Intelligence "job" (an async pipeline with stages, progress, and a terminal
status), it reuses the existing `Job` model instead — one less collection,
one less status-polling code path, and the frontend's `ProcessingPanel`
pattern (poll until terminal, then fetch results) works unchanged.

### Why the Overview dashboard was *not* changed

The platform-wide Overview page's KPIs ("Images Processed", "Extractions")
and recent-activity table are worded for Parcel Intelligence specifically.
Rather than generalize that wording (and risk making it vaguer for the
module it already serves), `dashboard.service.js` was explicitly scoped to
`moduleId: 'parcel-intelligence'`, and Employee Compliance gets its own
dashboard at `/modules/compliance` with wording and KPIs of its own
(total batches, total employees, matched employees, PF/ESIC mismatch counts,
needs-review count).

## Run locally in under 15 minutes

```bash
git clone <this-repo-url> && cd ai-hub

# 1) MongoDB — pick ONE, both free:
#    a) local: brew install mongodb-community && brew services start mongodb-community
#    b) cloud: a free MongoDB Atlas M0 cluster

# 2) Env files
cp backend/node-api/.env.example backend/node-api/.env
cp backend/python-ai/.env.example backend/python-ai/.env
cp frontend/.env.example frontend/.env
# fill in MONGODB_URI in both backend .env files

# 3) Install dependencies
cd backend/node-api && npm install && cd ../..
cd frontend && npm install && cd ..
cd backend/python-ai && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cd ../..

# 4) (Optional) Tesseract for the OCR fallback on scanned PDFs — the module
#    works fully without it, see below
brew install tesseract

# 5) Create the first login
cd backend/node-api && node scripts/seedAdmin.js you@example.com yourpassword123 && cd ../..

# 6) Start all three services (3 terminals)
cd backend/python-ai && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
cd backend/node-api && node src/server.js
cd frontend && npm run dev
```

Sign in at `http://localhost:5173`, open **Employee Compliance
Verification**, and upload the three sample files at
`test-data/compliance-samples-real/` (wagesheet + both ECR PDFs) to get
started.

### Optional: OCR fallback for scanned PDFs

If a PF/ESIC ECR PDF has no extractable text (a scanned image rather than a
native PDF), the parser falls back to Tesseract OCR via `pytesseract`. This
requires the Tesseract binary to be installed separately (`brew install
tesseract` on macOS) — without it, the parser still runs, just without that
fallback, and reports the page as unreadable rather than crashing.

## Input requirements

| File | Format | Notes |
|---|---|---|
| Vendor Wagesheet | `.xlsx` / `.xls` | Columns (flexibly matched, not exact-string): Name, UAN, IP Number, Agency, State, `ESIC @ 0.75%`, `PF @ 12%` |
| PF ECR Filing | `.pdf` | EPFO ECR export — UAN, employee name, EE (employee) share |
| ESIC ECR Filing | `.pdf` | ESIC portal export — IP Number, employee name, wages, IP contribution |

> **A note on the source files**: the Excel parser and both PDF parsers
> were originally built against the column/field names documented in the
> spec itself (flexible regex matching, not hardcoded exact strings), since
> no real sample files were available at the time. Real sample files
> (`Sample_Wagesheet_Aug25.xlsx`, `PF ECR AUG-25 SAMPLE.pdf`, `ESIC ECR
> AUG-25 SAMPLE.pdf`) were provided during review and run through the full
> live stack — this caught and fixed two real bugs the synthetic fixtures
> had missed: the PF ECR's EE-share column was being misread as the wrong
> one of 8 trailing numeric columns (NCP Days instead of EE Share), and two
> adjacent name columns ("Name as per ECR" + "Name as per UAN Repository")
> were concatenating into one doubled name in plain-text extraction. Both
> are fixed and covered by `tests/test_real_sample_files.py`; the real
> files are saved as submission test data at
> `test-data/compliance-samples-real/`.

The parsers never silently drop an invalid row. A blank name, a missing
UAN/IP Number, an unparsable or negative amount, or a duplicate identifier
is recorded against that row (`rowErrors`) and the row is still carried
through the pipeline, surfacing as `NEEDS_REVIEW` rather than disappearing.

## Name matching

`rapidfuzz.fuzz.token_sort_ratio` compares the wagesheet name against the
matched ECR record's name, normalized for case/whitespace/punctuation first.
Three bands avoid forcing every comparison into a binary match/reject:

| Score | Classification |
|---|---|
| ≥ 90 | `MATCH` |
| 70–89.9 | `REVIEW` — plausible but not confident enough to auto-accept |
| < 70 | `MISMATCH` |

Thresholds are configurable via environment variables
(`COMPLIANCE_NAME_AUTO_MATCH_THRESHOLD`, `COMPLIANCE_NAME_MISMATCH_THRESHOLD`)
in `backend/python-ai/app/modules/employee_compliance/verification/config.py`.

**Known limitation — shared surnames inflate the score.** `token_sort_ratio`
scores shared tokens favorably regardless of position, so two *different*
people who happen to share a surname can score deceptively high — e.g.
"Ravi Kumar" vs. "Vijay Kumar" scores ~76 (the `REVIEW` band, not a clear
mismatch) purely because of the shared token "Kumar". This was caught during
test-writing (see `test_esic_name_mismatch` in
`tests/test_verification.py`) and is a real, documented gap: a name swap
between two people with the same common surname may land in `NEEDS_REVIEW`
rather than `NAME_MISMATCH`. Given the `REVIEW` band already routes these
cases to a human rather than auto-matching them, the practical risk is low,
but it's worth knowing about.

## Amount verification

Deterministic, not LLM-based — comparing two numbers doesn't need a
language model, and determinism matters for an audit trail. The wagesheet
amount is compared to the ECR amount with a configurable rounding tolerance
(`COMPLIANCE_AMOUNT_TOLERANCE`, default ₹1.00) to absorb benign rounding
differences without masking real discrepancies.

## Status definitions (exactly 5, in priority order)

For each of PF and ESIC, independently:

1. **`NEEDS_REVIEW`** — the wagesheet row itself has an error (missing
   identifier, invalid amount, duplicate UAN/IP Number across ECR records),
   OR the name similarity falls in the `REVIEW` band. Checked first: a
   row's own data problems take priority over anything else.
2. **`MISSING`** — no ECR record found for that UAN/IP Number at all.
3. **`NAME_MISMATCH`** — a record was found, but the name similarity is in
   the `MISMATCH` band. Checked *before* the amount, per the definition
   that an amount match is only meaningful once the identity is confirmed —
   a coincidentally-correct amount must never mask a wrong name.
4. **`AMOUNT_MISMATCH`** — name matched, but the amount differs by more
   than the configured tolerance.
5. **`MATCHED`** — name matched and amount matched within tolerance.

## Testing

48 tests across parsers, normalizers, name matching, verification logic,
report generation, a full mongomock-backed integration test of the entire
pipeline, and a dedicated real-sample-file regression suite:

```bash
cd backend/python-ai
source .venv/bin/activate
pytest app/modules/employee_compliance/tests/ -v
```

Synthetic fixtures (`tests/conftest.py`) cover 10 named scenarios: fully
matched, PF amount mismatch, ESIC amount mismatch, PF name mismatch, ESIC
name mismatch, missing PF record, missing ESIC record, a minor spelling
variation (`NEEDS_REVIEW`, not silently accepted), a duplicate UAN in the
PF ECR (`NEEDS_REVIEW`, never silently picks one), and a truncated name
(`NEEDS_REVIEW`). Every similarity score used in the fixtures was computed
by actually calling `compute_name_similarity` rather than estimated, and
the real end-to-end flow (Node API → Python → MongoDB → results → Excel
export) was additionally verified manually against a running stack using
the same fixtures, saved as reusable test data at
`test-data/compliance-samples/`.

## Known limitations

- **PDF parsing was calibrated against one real vendor's ECR layout**
  (see the sample files above) — flexible regex matching should tolerate
  minor formatting differences in a different vendor's export, but an ECR
  with a substantially different column order or label set would still be
  worth re-verifying against.
- **Shared-surname name matching** — see Name Matching above.
- **OCR fallback needs Tesseract installed separately** — without it, a
  scanned (non-text) PDF page is reported as unreadable rather than parsed.
- **No Celery/background queue** — processing runs as a FastAPI
  `BackgroundTask` in-process, consistent with the rest of the platform's
  current (pre-Redis) state. Fine for the batch sizes this module expects;
  would need revisiting for very large wagesheets or high concurrent load.

## What I'd improve with more time

- Recalibrate PDF parsers against real EPFO/ESIC ECR exports once available.
- A name-matching strategy less sensitive to shared surnames (e.g. weighting
  by token position, or a dedicated first-name/last-name split comparison).
- Bulk actions on the results table (e.g. mark a page of `NEEDS_REVIEW` rows
  as manually reviewed).
- Batch comparison across months, to spot a vendor's compliance trending
  worse over time rather than looking at one batch in isolation.
