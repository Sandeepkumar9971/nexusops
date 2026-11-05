from __future__ import annotations

import datetime
import os

import pandas as pd

from app.modules.fc_financial_monitor.normalizers.column_normalizer import (
    FC_IDENTIFIER_FIELDS,
    REQUIRED_FIELDS,
    match_columns,
)
from app.modules.fc_financial_monitor.schemas.models import FinancialRow, ParseResult

COST_FIELDS = ["manpower_cost", "packaging_cost", "power_and_fuel", "fc_rent", "equipment_rentals", "overheads"]

# A real workbook (confirmed against an actual sample) can hold more than
# one sheet — e.g. a reference "Ideal FC Criteria" target-ranges sheet
# alongside the actual "Day Wise PnL" data sheet — and the data sheet
# itself can have a blank spacer row above its real header row rather than
# headers in row 1. Scanning every sheet's first few rows for the one that
# actually matches our expected columns, instead of assuming sheet 0 /
# row 0, finds the real data regardless of layout.
HEADER_SCAN_ROWS = 10

# A day column with no real calendar date at all (confirmed against an
# actual sample: a bare "Day" column holding 1, 2, 3, … with no month/year
# anywhere in the file) still needs a sortable, chartable date internally.
# Rather than guess a real month, every such file is anchored to this fixed,
# arbitrary, deterministic reference date — so the same file always produces
# the same synthesized dates no matter when it's (re-)uploaded — and the
# synthesis is always disclosed via a document-level note, never silently
# presented as the FC's real reporting date.
SYNTHETIC_DAY_ANCHOR = datetime.date(2024, 1, 1)
SYNTHETIC_DAY_NOTE = (
    "The 'Day' column contained sequential day numbers (1, 2, 3, …) rather than calendar dates — "
    "synthetic calendar dates were assigned sequentially from a fixed reference date ({anchor}) solely "
    "to preserve chronological order for sorting and charting. These are NOT the FC's actual reporting "
    "dates; only the day-to-day sequence is meaningful."
).format(anchor=SYNTHETIC_DAY_ANCHOR.isoformat())


def _score_header_row(cells: list, overrides: dict[str, str] | None) -> tuple[int, dict]:
    """How many canonical fields a candidate header row resolves, and the
    resulting column map — used to pick the best (sheet, header-row) pair
    out of every row scanned across every sheet."""
    headers = [str(c) if c is not None and not (isinstance(c, float) and pd.isna(c)) else "" for c in cells]
    column_map = match_columns(headers, overrides=overrides)
    return len(column_map), column_map


def _read_sheet_with_header(file_path: str, sheet_name, header_row: int) -> pd.DataFrame:
    if os.path.splitext(file_path)[1].lower() == ".csv":
        return pd.read_csv(file_path, dtype=str, keep_default_na=True, header=header_row)
    return pd.read_excel(file_path, sheet_name=sheet_name, dtype=str, header=header_row)


def _find_best_sheet_and_columns(file_path: str, column_mapping: dict[str, str] | None):
    """Returns (dataframe, column_map, detected_columns) for whichever
    (sheet, header-row) combination resolves the most canonical fields —
    or (None, {}, []) if the file couldn't be read at all."""
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".csv":
        raw = pd.read_csv(file_path, dtype=str, keep_default_na=True, header=None)
        candidates = [(None, raw)]
    elif ext in (".xlsx", ".xls"):
        sheet_names = pd.ExcelFile(file_path).sheet_names
        candidates = [(name, pd.read_excel(file_path, sheet_name=name, dtype=str, header=None)) for name in sheet_names]
    else:
        raise ValueError(f"Unsupported file extension: {ext}")

    best = None  # (score, sheet_name, header_row, column_map, detected_columns)
    for sheet_name, raw_df in candidates:
        scan_limit = min(HEADER_SCAN_ROWS, len(raw_df))
        for row_idx in range(scan_limit):
            cells = list(raw_df.iloc[row_idx])
            score, column_map = _score_header_row(cells, column_mapping)
            if score == 0:
                continue
            if best is None or score > best[0]:
                detected_columns = [str(c) for c in cells if c is not None and not (isinstance(c, float) and pd.isna(c))]
                best = (score, sheet_name, row_idx, column_map, detected_columns)

    if best is None:
        return None, {}, []

    _, sheet_name, header_row, column_map, detected_columns = best
    frame = _read_sheet_with_header(file_path, sheet_name if sheet_name is not None else 0, header_row)
    return frame, column_map, detected_columns


def _parse_number(raw_value) -> tuple[float | None, str | None]:
    """Returns (value, error). Never coerces a missing/invalid value to 0 —
    that would silently fabricate a verified-looking figure."""
    if raw_value is None or (isinstance(raw_value, float) and pd.isna(raw_value)):
        return None, "missing"
    if isinstance(raw_value, str) and not raw_value.strip():
        return None, "missing"
    cleaned = str(raw_value).replace(",", "").replace("₹", "").strip()
    try:
        value = float(cleaned)
    except (TypeError, ValueError):
        return None, f"invalid numeric value: {raw_value!r}"
    return value, None


def _as_sequential_day_number(raw_value) -> int | None:
    """Returns an int if raw_value looks like a bare sequence number (e.g.
    "1", "45.0") rather than any recognizable date — used to detect the
    "Day column is 1, 2, 3, …" case before falling back to a real failure."""
    if raw_value is None:
        return None
    text = str(raw_value).strip()
    if not text:
        return None
    try:
        as_float = float(text)
    except ValueError:
        return None
    if as_float != int(as_float) or as_float < 1:
        return None
    return int(as_float)


def _parse_day(raw_value) -> tuple[object | None, str | None, bool]:
    """Returns (date, error, was_synthesized)."""
    if raw_value is None or (isinstance(raw_value, float) and pd.isna(raw_value)):
        return None, "missing date", False
    try:
        parsed = pd.to_datetime(raw_value, errors="raise")
        return parsed.date(), None, False
    except (TypeError, ValueError):
        pass

    sequence_number = _as_sequential_day_number(raw_value)
    if sequence_number is not None:
        synthesized = SYNTHETIC_DAY_ANCHOR + datetime.timedelta(days=sequence_number - 1)
        return synthesized, None, True

    return None, f"invalid date: {raw_value!r}", False


def parse_financial_file(
    file_path: str, column_mapping: dict[str, str] | None = None, default_fc_name: str | None = None
) -> ParseResult:
    try:
        frame, column_map, detected_columns = _find_best_sheet_and_columns(file_path, column_mapping)
    except Exception as exc:  # noqa: BLE001 - any failure here means "can't read this file"
        return ParseResult(document_errors=[f"Could not read file: {exc}"])

    if frame is None or frame.empty:
        return ParseResult(document_errors=["File is empty — no recognizable data found in any sheet."])

    missing_required = [f for f in REQUIRED_FIELDS if f not in column_map]
    if missing_required:
        return ParseResult(
            document_errors=[f"Missing required column(s): {', '.join(missing_required)}"],
            detected_columns=detected_columns,
            resolved_mapping=column_map,
        )

    fc_identifier_present = any(f in column_map for f in FC_IDENTIFIER_FIELDS)
    default_fc_name = (default_fc_name or "").strip() or None
    if not fc_identifier_present and not default_fc_name:
        return ParseResult(
            document_errors=[
                "No FC identifier column found (expected an 'FC Name' or 'FC ID' column). "
                "Map a column to the FC identifier, or provide a single FC name for this whole file, to continue."
            ],
            detected_columns=detected_columns,
            fc_identifier_present=False,
            resolved_mapping=column_map,
        )

    rows: list[FinancialRow] = []
    seen_fc_dates: dict[tuple, int] = {}
    document_errors: list[str] = []
    synthetic_dates_used = False

    for idx, series in frame.iterrows():
        row_number = idx + 2  # +1 for 0-index, +1 for the header row
        errors: list[str] = []

        fc_id = None
        if "fc_id" in column_map:
            raw = series.get(column_map["fc_id"])
            fc_id = str(raw).strip() if raw is not None and str(raw).strip().lower() != "nan" else None
        fc_name = None
        if "fc_name" in column_map:
            raw = series.get(column_map["fc_name"])
            fc_name = str(raw).strip() if raw is not None and str(raw).strip().lower() != "nan" else None

        if not fc_id and not fc_name:
            if default_fc_name:
                fc_name = default_fc_name
            else:
                errors.append("missing FC identifier")

        day, day_error, day_synthesized = _parse_day(series.get(column_map["day"]))
        if day_error:
            errors.append(f"date: {day_error}")
        if day_synthesized:
            synthetic_dates_used = True

        revenue, revenue_error = _parse_number(series.get(column_map["revenue"]))
        if revenue_error:
            errors.append(f"revenue: {revenue_error}")
        elif revenue is not None and revenue < 0:
            errors.append(f"negative revenue: {revenue}")

        cost_values: dict[str, float | None] = {}
        for field in COST_FIELDS:
            value, error = _parse_number(series.get(column_map[field]))
            if error:
                errors.append(f"{field.replace('_', ' ')}: {error}")
            elif value is not None and value < 0:
                errors.append(f"negative {field.replace('_', ' ')}: {value}")
            cost_values[field] = value

        # Skip fully blank trailing rows (common at the end of a sheet)
        # rather than reporting them as broken records.
        if (
            not fc_id
            and not fc_name
            and day is None
            and revenue is None
            and all(v is None for v in cost_values.values())
        ):
            continue

        fc_key = (fc_id or fc_name, str(day))
        if fc_key in seen_fc_dates:
            errors.append(f"duplicate FC-date record (also row {seen_fc_dates[fc_key]})")
        else:
            seen_fc_dates[fc_key] = row_number

        rows.append(
            FinancialRow(
                row_number=row_number,
                fc_id=fc_id,
                fc_name=fc_name,
                day=day,
                revenue=revenue,
                manpower_cost=cost_values["manpower_cost"],
                packaging_cost=cost_values["packaging_cost"],
                power_and_fuel=cost_values["power_and_fuel"],
                fc_rent=cost_values["fc_rent"],
                equipment_rentals=cost_values["equipment_rentals"],
                overheads=cost_values["overheads"],
                errors=errors,
            )
        )

    if not rows:
        return ParseResult(document_errors=["No data rows found in file."], detected_columns=detected_columns)

    if synthetic_dates_used:
        document_errors.append(SYNTHETIC_DAY_NOTE)

    return ParseResult(
        rows=rows,
        document_errors=document_errors,
        detected_columns=detected_columns,
        fc_identifier_present=True,
        resolved_mapping=column_map,
    )
