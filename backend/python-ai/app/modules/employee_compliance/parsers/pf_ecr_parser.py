from __future__ import annotations

import re

import pdfplumber

from app.modules.employee_compliance.normalizers.identifier_normalizer import normalize_identifier
from app.modules.employee_compliance.schemas.models import ParseResult, PfEcrRecord

UAN_PATTERN = re.compile(r"\b(\d{12})\b")
AMOUNT_PATTERN = re.compile(r"\d{1,3}(?:,\d{3})*(?:\.\d+)?")


def _find_header_indices(header_row: list) -> dict:
    """A real EPFO ECR's member table (confirmed against an actual sample)
    uses terser, different headers than first assumed: "Name as per ECR" /
    "Name as per UAN Repository" (two name columns, not one, with no column
    simply called "Name"), and a bare "EE" for the employee contribution
    share (no "share"/"contribution" qualifier in the header text at all).
    """
    indices: dict = {}
    name_candidates: list[tuple[int, str]] = []

    for i, cell in enumerate(header_row):
        if not cell:
            continue
        text = str(cell).strip().lower()
        if "uan" in text and "uan" not in indices:
            indices["uan"] = i
        elif "name" in text:
            name_candidates.append((i, text))
        elif text == "ee" or (("ee" in text or "employee" in text) and ("share" in text or "contri" in text)):
            indices["ee_share"] = i

    if name_candidates:
        # Prefer "Name as per ECR" (what the vendor itself submitted, and
        # therefore the one actually worth comparing against the
        # wagesheet) over "Name as per UAN Repository" when both exist.
        ecr_name = next((i for i, text in name_candidates if "ecr" in text), None)
        indices["name"] = ecr_name if ecr_name is not None else name_candidates[0][0]

    return indices


def _parse_amount_cell(cell) -> float | None:
    if cell is None:
        return None
    text = str(cell).replace(",", "").strip()
    if not text:
        return None
    try:
        return round(float(text), 2)
    except ValueError:
        return None


def _extract_from_table(table: list, page_index: int) -> list[PfEcrRecord]:
    header_indices = _find_header_indices(table[0])
    if "uan" not in header_indices:
        return []

    records = []
    for row in table[1:]:
        if not row or header_indices["uan"] >= len(row):
            continue
        uan = normalize_identifier(row[header_indices["uan"]])
        if not uan or not re.fullmatch(r"\d{12}", uan):
            continue  # not a data row — subtotal/footer line etc.

        name = None
        if "name" in header_indices and header_indices["name"] < len(row):
            name = (row[header_indices["name"]] or "").strip() or None

        ee_share = None
        if "ee_share" in header_indices and header_indices["ee_share"] < len(row):
            ee_share = _parse_amount_cell(row[header_indices["ee_share"]])

        records.append(PfEcrRecord(uan=uan, name=name, ee_share=ee_share, page=page_index))
    return records


def _dedupe_repeated_name(raw_name: str) -> str:
    """A real EPFO ECR line (confirmed against an actual sample) prints
    BOTH "Name as per ECR" and "Name as per UAN Repository" back-to-back
    with no separator in the plain-text extraction — and in practice
    they're usually identical, producing a doubled "ANIL KUMAR ANIL KUMAR".
    If the leading word sequence splits evenly into two identical halves,
    collapse it to one; otherwise leave it as-is (a wrong guess at the
    split point would be worse than leaving the duplicate visible for a
    human to notice)."""
    words = raw_name.split()
    if len(words) >= 2 and len(words) % 2 == 0:
        half = len(words) // 2
        if [w.upper() for w in words[:half]] == [w.upper() for w in words[half:]]:
            return " ".join(words[:half])
    return raw_name


def _extract_from_text_fallback(text: str, page_index: int) -> list[PfEcrRecord]:
    """Used when a page has no clean table structure pdfplumber can
    segment into cells — confirmed against a real EPFO ECR sample to be
    the NORMAL case (these exports have no drawn table gridlines at all),
    not a rare degraded one.

    A real ECR member row has this fixed trailing shape after the name(s):
    Gross/EPF/EPS/EDLI Wages (4 numbers, often identical) — EE — EPS — ER
    — NCP Days. That means the EE share is always the 4th-from-last number
    on the line, never the last (the last is NCP Days) — the previous
    "take the last number" heuristic was silently reading NCP Days as the
    contribution amount. Rows that don't have at least 4 trailing numbers
    (a shorter/different ECR variant) fall back to the old last-number
    guess rather than indexing into a list that doesn't fit the pattern.
    """
    records = []
    for line in text.splitlines():
        match = UAN_PATTERN.search(line)
        if not match:
            continue
        uan = match.group(1)
        remainder = line.replace(uan, "", 1)
        amounts = AMOUNT_PATTERN.findall(remainder)
        ee_share = None
        if amounts:
            target = amounts[-4] if len(amounts) >= 4 else amounts[-1]
            try:
                ee_share = round(float(target.replace(",", "")), 2)
            except ValueError:
                ee_share = None
        name = AMOUNT_PATTERN.sub("", remainder).strip(" -|\t") or None
        if name:
            name = _dedupe_repeated_name(name)
        records.append(PfEcrRecord(uan=uan, name=name, ee_share=ee_share, page=page_index))
    return records


def _ocr_page_text(page) -> str | None:
    """Rasterizes a page and runs Tesseract when it has no extractable
    text at all (a strong signal it's a scanned image, not real text).
    Returns None — not an empty string — if OCR itself isn't available, so
    the caller can tell "no text" apart from "couldn't even try"."""
    try:
        import pytesseract

        image = page.to_image(resolution=300).original
        return pytesseract.image_to_string(image)
    except Exception:  # noqa: BLE001 - missing Tesseract binary, etc.
        return None


def parse_pf_ecr(file_path: str) -> ParseResult:
    records: list[PfEcrRecord] = []
    document_errors: list[str] = []
    used_fallback = False
    used_ocr = False

    try:
        with pdfplumber.open(file_path) as pdf:
            if len(pdf.pages) == 0:
                return ParseResult(document_errors=["PF ECR PDF has no pages."], is_reliable=False)

            for page_index, page in enumerate(pdf.pages, start=1):
                page_records: list[PfEcrRecord] = []
                for table in page.extract_tables() or []:
                    if table and len(table) >= 2:
                        page_records.extend(_extract_from_table(table, page_index))

                if page_records:
                    records.extend(page_records)
                    continue

                text = page.extract_text()
                if not text or not text.strip():
                    ocr_text = _ocr_page_text(page)
                    if ocr_text is None:
                        document_errors.append(
                            f"Page {page_index}: appears to be a scanned image with no extractable text, "
                            "and OCR is unavailable on this server — flagging for manual review."
                        )
                        continue
                    text = ocr_text
                    document_errors.append(f"Page {page_index}: used OCR (scanned page) — verify manually.")
                    used_fallback = True
                    used_ocr = True

                fallback_records = _extract_from_text_fallback(text, page_index)
                if fallback_records:
                    records.extend(fallback_records)
                    used_fallback = True
                    document_errors.append(
                        f"Page {page_index}: used best-effort text parsing (no structured table found) — verify manually."
                    )
    except Exception as exc:  # noqa: BLE001
        return ParseResult(document_errors=[f"Could not read PF ECR PDF: {exc}"], is_reliable=False)

    if not records:
        return ParseResult(
            document_errors=document_errors or ["No PF ECR records found in the document."],
            is_reliable=False,
        )

    return ParseResult(rows=records, document_errors=document_errors, is_reliable=not used_fallback, used_ocr=used_ocr)