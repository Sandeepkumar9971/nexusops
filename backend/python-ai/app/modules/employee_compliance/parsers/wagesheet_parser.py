from __future__ import annotations

import re

import pandas as pd

from app.modules.employee_compliance.normalizers.identifier_normalizer import normalize_identifier
from app.modules.employee_compliance.schemas.models import ParseResult, WagesheetRow

# Column headers vary across vendors ("UAN", "UAN No", "UAN Number"; "PF @
# 12%", "PF(12%)", "PF Amount"). Rather than require an exact header match
# (which breaks the moment one vendor phrases a header slightly
# differently), each canonical field is matched against a set of keyword
# patterns applied to the normalized (lowercased, punctuation-stripped)
# header text — order matters: more specific patterns are checked first so
# e.g. "ESIC @ 0.75%" doesn't also satisfy the PF pattern.
COLUMN_PATTERNS = {
    "ip_number": [r"\bip\s*(no|number)\b", r"\besic\s*(no|number)\b"],
    "esic_amount": [r"\besic\b"],
    "uan": [r"\buan\b"],
    "pf_amount": [r"\bpf\b"],
    "agency": [r"\bagency\b", r"\bvendor\b"],
    "state": [r"\bstate\b"],
    "name": [r"\bname\b"],
}
# Checked in this order so identifier/amount columns (which also happen to
# contain "ip"/"esic"/"pf") don't get mis-claimed by a looser later pattern.
FIELD_ORDER = ["ip_number", "esic_amount", "uan", "pf_amount", "agency", "state", "name"]

REQUIRED_FIELDS = ["name", "uan", "ip_number", "pf_amount", "esic_amount"]


def _normalize_header(header) -> str:
    return re.sub(r"[^a-z0-9%.]+", " ", str(header).strip().lower()).strip()


def _match_columns(headers: list[str]) -> dict[str, str]:
    """Returns {canonical_field: original_header_text} for whichever
    columns were actually found."""
    normalized = {header: _normalize_header(header) for header in headers}
    matched = {}
    claimed_headers = set()

    for field in FIELD_ORDER:
        for header, norm in normalized.items():
            if header in claimed_headers:
                continue
            if any(re.search(pattern, norm) for pattern in COLUMN_PATTERNS[field]):
                matched[field] = header
                claimed_headers.add(header)
                break

    return matched


def _parse_amount(raw_value) -> tuple[float | None, str | None]:
    """Returns (amount, error). Never silently coerces an invalid value to
    0 — that would look like a real, verified zero contribution."""
    if raw_value is None or (isinstance(raw_value, float) and pd.isna(raw_value)):
        return None, "missing amount"
    if isinstance(raw_value, str) and not raw_value.strip():
        return None, "missing amount"
    try:
        value = float(raw_value)
    except (TypeError, ValueError):
        return None, f"invalid numeric amount: {raw_value!r}"
    if value < 0:
        return None, f"negative amount: {value}"
    return round(value, 2), None


def parse_wagesheet(file_path: str) -> ParseResult:
    try:
        # sheet_name=0 reads the first sheet — vendors are not expected to
        # spread one wagesheet across multiple sheets, but if a workbook
        # turns out to need a specific sheet name, this is the one place
        # to change it.
        frame = pd.read_excel(file_path, sheet_name=0, dtype=str)
    except Exception as exc:  # noqa: BLE001 - any failure here means "can't read this file"
        return ParseResult(document_errors=[f"Could not read Excel file: {exc}"], is_reliable=False)

    if frame.empty:
        return ParseResult(document_errors=["Wagesheet is empty."], is_reliable=False)

    column_map = _match_columns(list(frame.columns))
    missing_required = [f for f in REQUIRED_FIELDS if f not in column_map]
    if missing_required:
        return ParseResult(
            document_errors=[f"Missing required column(s) in wagesheet: {', '.join(missing_required)}"],
            is_reliable=False,
        )

    rows: list[WagesheetRow] = []
    seen_uans: dict[str, int] = {}
    seen_ips: dict[str, int] = {}

    for idx, series in frame.iterrows():
        row_number = idx + 2  # +1 for 0-index, +1 for the header row
        errors: list[str] = []

        name = str(series.get(column_map["name"], "")).strip() or None
        if not name or name.lower() == "nan":
            name = None
            errors.append("blank employee name")

        uan = normalize_identifier(series.get(column_map["uan"]))
        if not uan:
            errors.append("missing UAN")

        ip_number = normalize_identifier(series.get(column_map["ip_number"]))
        if not ip_number:
            errors.append("missing IP Number")

        pf_amount, pf_error = _parse_amount(series.get(column_map["pf_amount"]))
        if pf_error:
            errors.append(f"PF amount: {pf_error}")

        esic_amount, esic_error = _parse_amount(series.get(column_map["esic_amount"]))
        if esic_error:
            errors.append(f"ESIC amount: {esic_error}")

        agency = str(series.get(column_map.get("agency", ""), "")).strip() or None
        state = str(series.get(column_map.get("state", ""), "")).strip() or None

        # Skip fully blank trailing rows (common at the end of a sheet)
        # rather than reporting them as broken employee records.
        if not name and not uan and not ip_number and pf_amount is None and esic_amount is None:
            continue

        if uan:
            if uan in seen_uans:
                errors.append(f"duplicate UAN (also row {seen_uans[uan]})")
            else:
                seen_uans[uan] = row_number
        if ip_number:
            if ip_number in seen_ips:
                errors.append(f"duplicate IP Number (also row {seen_ips[ip_number]})")
            else:
                seen_ips[ip_number] = row_number

        rows.append(
            WagesheetRow(
                row_number=row_number,
                name=name,
                uan=uan,
                ip_number=ip_number,
                agency=agency,
                state=state,
                esic_amount=esic_amount,
                pf_amount=pf_amount,
                errors=errors,
            )
        )

    if not rows:
        return ParseResult(document_errors=["No employee rows found in wagesheet."], is_reliable=False)

    return ParseResult(rows=rows)