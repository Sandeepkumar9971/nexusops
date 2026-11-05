import re
from datetime import datetime

# Real sample images show at least 3 different overlay schemas in the same
# dataset (different field names, delimiters, units, and even packed
# single-string encodings for dimensions/timestamps). Filename does NOT
# reliably indicate which schema an image uses. Rather than one rigid
# regex set, every OCR'd "label: value" line is normalized to a canonical
# key via this alias table — new label spellings can be added here without
# touching the parsing logic.
ALIASES = {
    "LOCATION": "location",
    "LOCATIONCODE": "location",
    "AWBNO": "awb",
    "AWB": "awb",
    "BARCODE": "awb",
    "LENGTH": "length",
    "WIDTH": "width",
    "HEIGHT": "height",
    "RVOL": "volume",
    "WEIGHT": "weight",
    "TIME": "timestamp",
    "DATETIME": "timestamp",
    "DIMENSION": "dimension",
    "SORTERID": "sorterId",
    "ID": "sorterId",
}

PAREN_PATTERN = re.compile(r"\(([^)]*)\)")
NUMBER_PATTERN = re.compile(r"-?\d+(?:\.\d+)?")
DIMENSION_BLOCK_PATTERN = re.compile(r"L(\d+)\D*H(\d+)\D*W(\d+)", re.IGNORECASE)


def _normalize_key(raw_label: str):
    """'LENGTH(cm)' -> ('LENGTH', 'cm'); 'AWB_NO' -> ('AWBNO', None)."""
    unit = None
    base = raw_label
    paren_match = PAREN_PATTERN.search(raw_label)
    if paren_match:
        unit = paren_match.group(1).strip().lower()
        base = raw_label[: paren_match.start()]
    normalized = re.sub(r"[^A-Za-z0-9]", "", base).upper()
    return normalized, unit


def _parse_number(value: str):
    match = NUMBER_PATTERN.search(value)
    return float(match.group()) if match else None


def _parse_length(value: str, unit_hint):
    number = _parse_number(value)
    if number is None:
        return None
    if "mm" in value.lower() or unit_hint == "mm":
        return round(number / 10, 2)
    return number  # default/explicit cm


def _parse_weight(value: str, unit_hint):
    number = _parse_number(value)
    if number is None:
        return None
    lower = value.lower()
    if "kg" in lower or unit_hint == "kg":
        return number
    if "g" in lower or unit_hint in ("g", "gm"):
        return round(number / 1000, 3)
    # Bare integer, no unit anywhere (observed packed-schema pattern,
    # e.g. "01280") — these are grams without a decimal point.
    if "." not in value:
        return round(number / 1000, 3)
    return number


def _parse_dimension_block(value: str) -> dict:
    """Packed format seen in one schema: 'L0424XH0173XW0246' (millimetres)."""
    match = DIMENSION_BLOCK_PATTERN.search(value)
    if not match:
        return {}
    length_mm, height_mm, width_mm = (int(group) for group in match.groups())
    return {
        "length": round(length_mm / 10, 2),
        "height": round(height_mm / 10, 2),
        "width": round(width_mm / 10, 2),
    }


def _parse_timestamp(value: str):
    value = value.strip()
    # Packed format: YYYYMMDDHHMMSSmmm (17 digits, no separators).
    if re.fullmatch(r"\d{17}", value):
        try:
            parsed = datetime.strptime(value[:14], "%Y%m%d%H%M%S")
            return parsed.replace(microsecond=int(value[14:]) * 1000)
        except ValueError:
            return None
    for fmt in ("%m/%d/%Y %I:%M:%S %p", "%d-%m-%Y %H:%M:%S.%f"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None  # unrecognized format — caller keeps the raw string, never guesses


def parse_overlay_text(raw_text: str) -> dict:
    """Parses OCR'd overlay text into canonical fields, regardless of which
    of the known schemas produced it. Unrecognized lines are kept in `raw`
    so nothing OCR'd is silently discarded, even if we can't map it yet."""
    fields = {
        "location": None,
        "awb": None,
        "length": None,
        "width": None,
        "height": None,
        "volume": None,
        "weight": None,
        "timestamp": None,
        "sorterId": None,
    }
    raw_pairs = {}

    for line in raw_text.splitlines():
        if ":" not in line:
            continue
        raw_label, _, raw_value = line.partition(":")
        raw_label = raw_label.strip()
        raw_value = raw_value.strip()
        if not raw_label or not raw_value:
            continue

        raw_pairs[raw_label] = raw_value
        key, unit = _normalize_key(raw_label)
        canonical = ALIASES.get(key)
        if canonical is None:
            continue

        if canonical == "dimension":
            for dim_key, dim_value in _parse_dimension_block(raw_value).items():
                if fields.get(dim_key) is None:
                    fields[dim_key] = dim_value
        elif canonical in ("length", "width", "height"):
            fields[canonical] = _parse_length(raw_value, unit)
        elif canonical == "weight":
            fields[canonical] = _parse_weight(raw_value, unit)
        elif canonical == "volume":
            fields[canonical] = _parse_number(raw_value)
        elif canonical == "timestamp":
            parsed = _parse_timestamp(raw_value)
            fields["timestamp"] = parsed.isoformat() if parsed else raw_value
        else:  # location, awb, sorterId — plain strings
            fields[canonical] = raw_value

    # Volume is a faithful arithmetic derivation from already-extracted
    # values, not a guess — only compute it when the overlay didn't state
    # it directly and all three dimensions are known.
    if fields["volume"] is None and all(fields[k] is not None for k in ("length", "width", "height")):
        fields["volume"] = round(fields["length"] * fields["width"] * fields["height"], 2)

    fields["raw"] = raw_pairs
    return fields
