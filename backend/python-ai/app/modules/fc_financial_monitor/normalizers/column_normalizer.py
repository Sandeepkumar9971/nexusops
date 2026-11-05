from __future__ import annotations

import re

# Column headers vary across sources ("FC Name" vs "Fulfilment Centre" vs
# "Warehouse"; "Power & Fuel" vs "Power and Fuel" vs "Electricity"). Each
# canonical field is matched against keyword patterns applied to the
# normalized (lowercased, punctuation-stripped) header — never an exact
# string match, so minor header rewording doesn't break parsing.
COLUMN_PATTERNS = {
    "fc_id": [r"\bfc\s*(id|code)\b"],
    "fc_name": [
        r"\bfc\s*name\b",
        r"\bfulfil+ment\s*cent(re|er)\b",
        r"\bfacility\b",
        r"\bwarehouse\b",
        r"^\bfc\b$",
    ],
    "day": [r"\bday\b", r"\bdate\b"],
    "revenue": [r"\brevenue\b", r"\bsales\b"],
    "manpower_cost": [r"\bmanpower\b"],
    "packaging_cost": [r"\bpackaging\b"],
    "power_and_fuel": [r"\bpower\b.*\bfuel\b", r"\belectricity\b"],
    "fc_rent": [r"\bfc\s*rent\b", r"\brent\b"],
    "equipment_rentals": [r"\bequipment\b"],
    "overheads": [r"\boverheads?\b"],
}
# Checked in this order so more specific patterns (e.g. "fc_rent" containing
# "fc") don't get shadowed by a looser one matched first.
FIELD_ORDER = [
    "fc_id",
    "fc_name",
    "day",
    "revenue",
    "manpower_cost",
    "packaging_cost",
    "power_and_fuel",
    "fc_rent",
    "equipment_rentals",
    "overheads",
]

REQUIRED_FIELDS = ["day", "revenue", "manpower_cost", "packaging_cost", "power_and_fuel", "fc_rent", "equipment_rentals", "overheads"]
FC_IDENTIFIER_FIELDS = ["fc_id", "fc_name"]


def normalize_header(header) -> str:
    return re.sub(r"[^a-z0-9%.&]+", " ", str(header).strip().lower()).strip()


def match_columns(headers: list[str], overrides: dict[str, str] | None = None) -> dict[str, str]:
    """Returns {canonical_field: original_header_text}. `overrides` lets a
    user's manual column mapping (from the upload workspace) win over
    auto-detection for any field they explicitly set."""
    normalized = {header: normalize_header(header) for header in headers}
    matched: dict[str, str] = {}
    claimed_headers = set()

    if overrides:
        for field, header in overrides.items():
            if header in normalized:
                matched[field] = header
                claimed_headers.add(header)

    for field in FIELD_ORDER:
        if field in matched:
            continue
        for header, norm in normalized.items():
            if header in claimed_headers:
                continue
            if any(re.search(pattern, norm) for pattern in COLUMN_PATTERNS[field]):
                matched[field] = header
                claimed_headers.add(header)
                break

    return matched
