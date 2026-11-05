"""Synthetic test fixtures for FC Financial Monitor.

No real sample Excel file was available when this module was built (see
the module README) — every FC name and figure here is fabricated, with
every CM1/CM2/cost-percentage outcome computed by hand against the actual
target ranges (CM1 65-70%, CM2 15-30%, cost categories per
scripts/seedFinancialTargets.js's example defaults: manpower 18-24%,
packaging 8-12%, power & fuel 4-6%, FC rent 18-22%, equipment rentals
4-6%, overheads 13-17%) so each row reliably lands in the scenario it's
meant to test:

  Alpha / 2026-01-01: fully clean day — CM1 68%, CM2 22%, every cost
    category inside its target range. No anomalies at all.
  Beta  / 2026-01-01: CM2 breach — manpower (30%) and power & fuel (15%)
    both well above target, CM1 drops to 60% (flagged) and CM2 to 5%
    (RED, flagged CRITICAL).
  Gamma / 2026-01-01: line-item-only breach — equipment rentals at 8%
    (target max 6%) is flagged, but CM1 (69%) and CM2 (22%) both stay
    comfortably inside their target ranges.
  Delta / 2026-01-01: suspiciously high CM2 — overheads underreported at
    9% (below its 13% minimum) pushes CM2 to 35% (BLUE), the "investigate
    potential underreporting" case.
"""

import csv

import pytest
from openpyxl import Workbook

HEADERS = ["Day", "FC Name", "Revenue", "Manpower Cost", "Packaging Cost", "Power & Fuel", "FC Rent", "Equipment Rentals", "Overheads"]

# (fc_name, day, revenue, manpower, packaging, power_and_fuel, fc_rent, equipment_rentals, overheads)
SCENARIO_ROWS = [
    ("Alpha", "2026-01-01", 100000, 22000, 10000, 5000, 20000, 5000, 16000),  # clean day
    ("Beta", "2026-01-01", 100000, 30000, 10000, 15000, 20000, 5000, 15000),  # CM2 breach (RED)
    ("Gamma", "2026-01-01", 100000, 21000, 10000, 5000, 20000, 8000, 14000),  # line-item-only breach
    ("Delta", "2026-01-01", 100000, 20000, 10000, 4000, 18000, 4000, 9000),  # suspiciously high CM2 (BLUE)
]


def _build_financial_workbook(path, rows=SCENARIO_ROWS):
    wb = Workbook()
    sheet = wb.active
    sheet.title = "Daily Financials"
    sheet.append(HEADERS)
    for fc_name, day, revenue, manpower, packaging, power, rent, equipment, overheads in rows:
        sheet.append([day, fc_name, revenue, manpower, packaging, power, rent, equipment, overheads])
    wb.save(path)


def _build_financial_csv(path, rows=SCENARIO_ROWS):
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(HEADERS)
        for fc_name, day, revenue, manpower, packaging, power, rent, equipment, overheads in rows:
            writer.writerow([day, fc_name, revenue, manpower, packaging, power, rent, equipment, overheads])


@pytest.fixture
def financial_workbook_path(tmp_path):
    path = tmp_path / "daily_financials.xlsx"
    _build_financial_workbook(path)
    return str(path)


@pytest.fixture
def financial_csv_path(tmp_path):
    path = tmp_path / "daily_financials.csv"
    _build_financial_csv(path)
    return str(path)


@pytest.fixture
def seeded_targets_db():
    """An in-memory financial_targets collection with the same example
    defaults scripts/seedFinancialTargets.js installs in a real deployment
    — used by tests that need configured cost-category targets without
    depending on that script having been run."""
    import mongomock

    db = mongomock.MongoClient().db
    db["financial_targets"].insert_many(
        [
            {"metric": "manpower_cost", "minimum": 18, "maximum": 24, "source": "default-estimate"},
            {"metric": "packaging_cost", "minimum": 8, "maximum": 12, "source": "default-estimate"},
            {"metric": "power_and_fuel", "minimum": 4, "maximum": 6, "source": "default-estimate"},
            {"metric": "fc_rent", "minimum": 18, "maximum": 22, "source": "default-estimate"},
            {"metric": "equipment_rentals", "minimum": 4, "maximum": 6, "source": "default-estimate"},
            {"metric": "overheads", "minimum": 13, "maximum": 17, "source": "default-estimate"},
        ]
    )
    return db
