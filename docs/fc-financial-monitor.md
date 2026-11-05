# FC Financial Monitor

Automates daily P&L monitoring across fulfilment centres (FCs): calculates
contribution margins, flags cost and margin anomalies against configurable
targets, explains *why* each anomaly happened, and produces a daily
colour-coded digest per FC — so a manager doesn't have to manually check
spreadsheets to catch a declining margin on the same day it happens.

## Business problem

Every FC generates daily revenue and cost data. Without automation, someone
has to manually compare that data against expected cost ratios to spot a
problem — a slow, error-prone process that delays the one thing that
actually matters: catching a financial issue *the day it happens*, not a
week later during a monthly review. This module reads a daily financial
file, computes CM1/CM2 and every cost category's percentage of revenue,
compares each against a configured target range, explains any breach in
plain language with the largest contributors ranked by financial impact,
and surfaces it all as a consolidated dashboard, a per-FC detail page with
historical trends, an anomaly-management workflow, and a daily digest —
with alerts dispatched (or honestly marked as not yet configured) for any
FC that isn't Green.

## Architecture

Built on the same shared platform infrastructure as the other two
modules — no separate app, no separate auth, no separate job system:

```
React (frontend)                 POST /api/fc-financial-monitor/batches
  Upload workspace (+ preview)  →  (Node API, shared Job model)
  Processing panel (11 stages)            │
  FC performance dashboard                ▼ fire-and-forget
  FC detail page (recharts)     POST /process-financial-batch
  Anomaly management               (Python FastAPI, BackgroundTasks)
  Daily digest                              │
  Target configuration        parse → calculate → detect anomalies →
                               generate insights → persist → alert → report
                                           │
         MongoDB: jobs, fc_daily_financials, financial_anomalies,
                  financial_targets, financial_alerts, financial_audit_logs
```

- **Frontend**: `frontend/src/modules/fc-financial-monitor/` — a module
  folder shaped like the other two, reusing the platform's shared
  `Button`/`Card`/`DataTable`/`StatusBadge`/`KpiCard` components, plus
  `recharts` (already a project dependency, unused until now) for the
  historical trend charts on the FC detail page.
- **Node API**: `backend/node-api/src/modules/fc-financial-monitor/` —
  a two-phase upload flow (preview, then commit), five new Mongoose
  models, and read-mostly controllers for the dashboard/FC list/FC
  detail/anomaly management/target configuration/digests/alerts.
- **Python AI**: `backend/python-ai/app/modules/fc_financial_monitor/` —
  all parsing, calculation, anomaly detection, insight generation, alert
  dispatch, and report generation. Runs as a FastAPI `BackgroundTask`
  (no Celery/Redis, consistent with the rest of the platform's current
  state), writing progress directly to the shared `Job` document.

### Why the shared `Job` model instead of a dedicated `FinancialBatch`

Same reasoning as Employee Compliance's deviation from its own spec
sketch: this module's "batch" is an async pipeline with stages, progress,
and a terminal status — exactly what the existing `Job` model already
is. Rather than add a parallel `FinancialBatch` collection, `Job` gained
one new optional generic field, `summary` (a `Mixed` blob any module can
populate with its own batch-level aggregate — this module stores total
FCs, average CM1/CM2, and status counts there), reusable by any future
module with the same need.

### Why target ranges are a separate, configurable collection

The business rules give CM1 (65–70%) and CM2 (15–30%) targets directly —
those are hardcoded as a fallback (`SPECIFIED_CM_TARGETS` in both
`target_resolver.py` and the Node equivalent) since they come from the
specification itself, not a guess. Cost-category targets are different:
the spec says to compare against "the target range from the attached
Excel file." Cost-category targets are never hardcoded in calculation
code — they live in the `financial_targets` collection, editable via the
Target Configuration screen (`GET`/`PUT /api/fc-financial-monitor/targets/:metric`),
and a metric with no configured document is reported as "cannot be
evaluated against a configured target" rather than silently guessed.

`scripts/seedFinancialTargets.js` seeds cost-category ranges sourced from
the real "Ideal FC Criteria" sheet found in an actual sample workbook
(`source: 'reference-file'`, clearly distinguished in the UI from
`specification`/`configured`): Manpower 25–27%, Packaging 5–7%, Power &
Fuel 10–12%, FC Rent 15–18%, Equipment Rentals 5–8%, Overheads 10–12%.
Replace them via Target Configuration if your organization's real limits
differ.

## Technologies

Pandas for reading `.xlsx`/`.xls`/`.csv` uniformly and for date parsing
(`parsers/financial_parser.py`); Pydantic for schemas; OpenPyXL for the
Excel report; `requests` for the optional Slack/WhatsApp webhook alerts.
The calculation engine itself (`calculations/margin_calculations.py`) is
plain Python arithmetic — no NumPy needed, since each row is a handful of
scalar operations rather than a vectorizable batch. `rapidfuzz`/
`pdfplumber` from Employee Compliance aren't used here (no name-matching
or PDF parsing in this module). Frontend: `recharts` for the FC detail
page's trend charts (first use in the project — already a dependency,
previously unused).

## Input data structure

| Column | Notes |
|---|---|
| Day | The date; flexible matching also accepts a column literally named "Date" |
| FC identifier | Either an "FC Name" or "FC ID" column (flexible: "Facility", "Warehouse", "Fulfilment Centre" also match) — at least one is required |
| Revenue | |
| Manpower Cost | |
| Packaging Cost | |
| Power & Fuel | |
| FC Rent | |
| Equipment Rentals | |
| Overheads | |

`.xlsx`, `.xls`, and `.csv` are all supported. Column headers are matched
flexibly (regex against normalized header text, same approach as Employee
Compliance's wagesheet parser) rather than requiring an exact string, and
the upload workspace lets you override any auto-detected mapping before
processing. A row missing *its* FC identifier value is kept (never
silently dropped) and flagged as a data-quality anomaly instead.

**Multi-sheet / offset-header workbooks**: a real workbook can hold more
than one sheet (e.g. a reference "Ideal FC Criteria" sheet alongside the
actual "Day Wise PnL" data sheet) and the data sheet's real header row
isn't necessarily row 1 — `financial_parser.py` scores every row in the
first 10 rows of every sheet for how many canonical fields it resolves,
and parses whichever (sheet, header-row) pair scores highest, instead of
assuming sheet 0 / header row 0.

**Single-facility files with no FC Name/ID column at all**: when a file
has no FC identifier column anywhere and no `default_fc_name` was
provided, it's still rejected with a clear message — but the upload
workspace now also offers an "FC Name for This File" field, which applies
one fixed name to every row in the file instead of requiring a column.

**Bare sequential "Day" numbers instead of calendar dates**: when the Day
column holds `1, 2, 3, …` with no real date anywhere in the file,
`financial_parser.py` synthesizes calendar dates sequentially from a
fixed, deterministic reference date (2024-01-01) purely to preserve
chronological order for sorting/charting — the preview and the processed
batch both disclose this via a document-level note; these are never
presented as the FC's actual reporting dates.

## CM1 calculation

```
CM1 = Revenue − Manpower Cost − Packaging Cost
CM1 % = (CM1 / Revenue) × 100
```

## CM2 calculation

```
CM2 = CM1 − Power & Fuel − FC Rent − Equipment Rentals − Overheads
CM2 % = (CM2 / Revenue) × 100
```

## Cost percentage calculations

Each of the six cost categories: `Cost % = (Cost Amount / Revenue) × 100`.

**Zero/invalid revenue is handled safely everywhere**: when revenue is
missing, zero, or negative, every percentage (CM1%, CM2%, every cost %)
comes back as `None` rather than a divide-by-zero crash or a misleading
number — the record is still created and persisted (never silently
discarded), flagged `revenue_invalid`, and classified as `UNKNOWN` rather
than forced into one of the four real colour bands.

## Target configuration

See Architecture above. In short: CM1/CM2 come from the business rules
directly; cost-category ranges live in MongoDB (`financial_targets`),
are editable via the UI without a code change, and anomaly detection
reports "not configured" rather than inventing a range when one is
missing.

## Anomaly detection rules

**CM1/CM2** (`anomaly_detection/engine.py`): flagged only when the
percentage deviates from its target range by **more than ±3 percentage
points** — a reading a point or two outside the range isn't treated as a
real problem. The deviation reported is the full distance from the
nearest bound (not minus the tolerance), so the number quoted in an
insight matches what a human would compute by hand.

**Cost categories**: no tolerance band — any value outside the configured
range is flagged, in either direction (a cost category below its minimum
is still flagged, since unexpectedly low spend can itself be worth a
second look, e.g. underreporting).

**Severity** (not specified by name in the business rules, so defined
here and documented): `CRITICAL` for a CM1/CM2 deviation beyond 2× the
tolerance (6pp) or when CM2 is in the Red band; `HIGH` for any other
flagged CM1/CM2 deviation; `MEDIUM` for a flagged cost category; `INFO`
for a metric with no configured target (can't be evaluated, not an actual
finding). A fifth state, `UNKNOWN`, only applies to the colour
classification (not severity) — see below.

**Data-quality anomalies**: a row with a missing/negative/invalid field
(substituted with 0 or treated as invalid for calculation purposes) gets
its own `HIGH`-severity "Data Quality" anomaly distinct from a genuine
margin/cost finding, so a data-entry problem is never mistaken for an
actual financial performance issue.

## Colour classification

Based on CM2%:

| CM2 % | Status |
|---|---|
| < 12% | Red |
| 12% – 14.9% | Yellow |
| 15% – 30% | Green |
| > 30% and < 33% | Yellow |
| ≥ 33% | Blue |

**On the "32.9% to 33%" boundary**: the business rules describe the upper
Yellow band as "Above 30%–32.9%" and Blue as "Above 33%" — read literally
at higher decimal precision (e.g. 32.95%), that leaves an undefined gap.
This is resolved as a single continuous boundary at exactly 33.0: every
value from just above 30% up to (but excluding) 33% is Yellow, and 33% or
higher is Blue. Every possible CM2% therefore has exactly one
classification, with no gap. See `classify_cm2_status()` for the
boundary-by-boundary test coverage.

Blue is **not** treated as good news — the UI and the generated insight
both explicitly frame it as "investigate potential underreported or
missing costs," per the business rules. A fifth state, `UNKNOWN`, applies
when revenue was zero/invalid and no percentage could be computed at all
— shown distinctly from all four real colours rather than defaulting to
one of them.

## Insight-generation approach

Deterministic and rule-based (`insights/insight_generator.py`) — every
number quoted in an insight was already computed by the calculation/
anomaly-detection layers; the insight generator only reads and
assembles those facts into a sentence, never recomputes or invents a
figure. Top contributors (cost-category anomalies, when present) are
ranked by `abs(financial_impact)` descending and the top three are named
in the summary, mirroring the business rules' own example format ("CM2
was X%, below the expected range... these cost categories contributed
significantly... recommend reviewing...").

No LLM is required or used for v1 — the business rules explicitly call
for the initial version to work reliably without one. The architecture
does support adding an optional LLM rewrite step later purely as a
prose-polishing pass over these same verified facts (never as a source of
new numbers) — see Future Intelligence Improvements.

## Alert workflow

Four channels, all optional and free-tier friendly — **no paid API key is
required** for the module to work:

| Channel | How it's configured | Behavior when unconfigured |
|---|---|---|
| In-app | Always available | Always `SENT` — this collection *is* the in-app notification history |
| Slack | `FINANCIAL_ALERT_SLACK_WEBHOOK_URL` env var (a free Slack incoming webhook) | `PENDING_CONFIGURATION` |
| Email | `FINANCIAL_ALERT_SMTP_HOST` + `FINANCIAL_ALERT_EMAIL_TO` (any SMTP server you already have access to) | `PENDING_CONFIGURATION` |
| WhatsApp | `FINANCIAL_ALERT_WHATSAPP_WEBHOOK_URL` (bring your own gateway — no bundled provider, since a real WhatsApp Business API isn't free) | `PENDING_CONFIGURATION` |

An alert is generated once per `(batch, FC, date)` for any FC that isn't
Green — enforced by a unique database index, so re-processing can never
create a duplicate. **Delivery is never faked**: a channel with no
configuration is honestly marked `PENDING_CONFIGURATION`, and a delivery
attempt that fails (e.g. the Slack webhook is unreachable) is marked
`FAILED` with the actual error recorded, never silently reported as sent.
See `alerts/alert_dispatcher.py` and the Daily Digest page's "Alert
Delivery" section, which shows each channel's real status per FC-date.

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

# 4) Create the first login
cd backend/node-api && node scripts/seedAdmin.js you@example.com yourpassword123 && cd ../..

# 5) Seed cost-category targets (sourced from the real "Ideal FC Criteria"
#    reference sheet — CM1/CM2 targets are always available without this)
cd backend/node-api && node scripts/seedFinancialTargets.js && cd ../..

# 6) Start all three services (3 terminals)
cd backend/python-ai && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
cd backend/node-api && node src/server.js
cd frontend && npm run dev
```

Sign in at `http://localhost:5173`, open **FC Financial Monitor**, and
upload the sample file at `test-data/fc-financial-samples/3excl_real_sample.xlsx`
to get started. It has no FC Name/ID column (a single-facility export) —
the upload workspace will prompt for one name to apply to every row.

### Optional: alert delivery

No new Python dependency beyond what's already in `requirements.txt`
(`requests` for Slack, the standard library's `smtplib` for email). Set
any of the environment variables in the Alert Workflow table above (in
`backend/python-ai/.env`) to enable real delivery on that channel — none
are required for the module to work; it works fully with only the in-app
channel active.

## Testing instructions

```bash
cd backend/python-ai
source .venv/bin/activate
pytest app/modules/fc_financial_monitor/tests/ -v
```

58 tests across parsing, calculations, anomaly detection (every colour
boundary individually verified), insight generation, alert dispatch
(including a mocked successful Slack delivery and a mocked failure),
report generation, a full mongomock-backed integration test of the
entire pipeline, and a dedicated real-sample regression suite
(`test_real_sample_file.py`).

The synthetic fixture in `tests/conftest.py` was built from the business
rules' own numbers, hand-calculated to land exactly on all four required
scenarios:

- **Alpha** (2026-01-01): one clean day — CM1 68%, CM2 22%, every cost
  category inside its target range, zero anomalies.
- **Beta** (2026-01-01): CM2 breach — Manpower (30%) and Power & Fuel
  (15%) both well above target; CM1 drops to 60% (flagged) and CM2 to
  5% (Red, flagged Critical).
- **Gamma** (2026-01-01): line-item-only breach — Equipment Rentals at
  8% (target max 6%) is flagged, while CM1 (69%) and CM2 (22%) both stay
  comfortably inside their target ranges.
- **Delta** (2026-01-01): suspiciously high CM2 — Overheads
  underreported at 9% (below its 13% minimum) pushes CM2 to 35% (Blue).

This fixture was additionally run through the real, running Node →
Python → MongoDB stack (not mocks) via the actual upload → preview →
process → dashboard → FC detail → anomaly management → daily digest →
Excel/CSV export flow, confirmed in-browser, and saved as reusable test
data at `test-data/fc-financial-samples/`.

**Real sample file** (`3excl.xlsx`, provided 2026-11-05): a genuine
multi-sheet workbook ("Ideal FC Criteria" + "Day Wise PnL"), 100 days,
single facility, bare sequential Day index, no FC identifier column — the
exact combination that originally made the file fail to parse at all
(detected only "Unnamed: 0/1/2/3" columns). Saved as
`test-data/fc-financial-samples/3excl_real_sample.xlsx` and covered by
`test_real_sample_file.py`, which pins down sheet/header auto-detection,
the `default_fc_name` override, date synthesis + disclosure, and exact
value parsing against the source workbook. Also run end-to-end through
the live stack (upload → preview → process → dashboard → FC detail),
confirmed in-browser: 100/100 rows processed, 382 anomalies detected
against the real "Ideal FC Criteria" target ranges, CM1 63.17%/CM2
18.38% on the latest day, Green status.

## Known limitations

- **Severity levels (CRITICAL/HIGH/MEDIUM/LOW/INFO) are this module's own
  convention**, not named explicitly in the business rules — documented
  above and in `anomaly_detection/engine.py`.
- **No Celery/background queue** — processing runs as a FastAPI
  `BackgroundTask` in-process, consistent with the rest of the platform's
  current (pre-Redis) state.
- **WhatsApp has no bundled provider** — a real WhatsApp Business API
  integration requires a paid Meta/Twilio-style setup; this module only
  provides a generic webhook hook for whichever gateway you bring.
- **The FC Overview dashboard shows a snapshot of each FC's most recent
  reporting date**, not a lifetime cumulative total — this is the
  operationally useful reading ("who is Red *right now*"), but it means
  "Total Revenue" on the dashboard is a sum of each FC's latest day, not
  all-time revenue.

## Future intelligence improvements

The initial system is deliberately deterministic and rule-based — no
LLM, no multi-agent system, no paid API — per the explicit instruction
not to overcomplicate the first version. The architecture is set up so
it can get smarter over time without a rewrite:

- **Memory of past days**: `fc_daily_financials` already stores every
  processed day per FC, not just the latest — a "has this FC breached
  the same cost category 3+ times this month" check is a query away, not
  a new data model.
- **Trend tracking**: the FC detail page's historical charts are already
  reading from that same per-day history; a weekly/monthly rollup or a
  rate-of-change alert ("CM2 has declined for 3 consecutive days") can be
  built as an additional pass over the same stored data.
- **Manual overrides**: Target Configuration already stores *who*
  configured a target and *when* — extending it to an approval workflow
  or per-FC target overrides (some FCs may legitimately run at different
  cost ratios) is a natural extension of the existing collection, not a
  new one.
- **FC-to-FC comparison**: since every FC's daily metrics live in the
  same collection with the same shape, a comparison view (e.g. percentile
  ranking of CM2% across FCs on the same date) is a new read endpoint,
  not new data.
- **Alert prioritization / more context-aware recommendations**: once
  enough history exists, the rule-based insight generator could be
  extended to factor in "has this exact anomaly repeated before" — and
  only at that point would an LLM add real value, purely to turn an
  already-verified, already-ranked set of facts (which this system
  already produces) into more varied or context-aware prose, never to
  decide what the facts are.
