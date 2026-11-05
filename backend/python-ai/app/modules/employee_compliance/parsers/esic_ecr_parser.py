from __future__ import annotations

import re

import pdfplumber

from app.modules.employee_compliance.normalizers.identifier_normalizer import normalize_identifier
from app.modules.employee_compliance.schemas.models import EsicEcrRecord, ParseResult

# ESIC IP Numbers are commonly 10 digits; kept slightly loose (9-10) since
# some legacy/temporary IP numbers are shorter.
IP_NUMBER_PATTERN = re.compile(r"\b(\d{9,10})\b")
AMOUNT_PATTERN = re.compile(r"\d{1,3}(?:,\d{3})*(?:\.\d+)?")


def _find_header_indices(header_row: list) -> dict:
    """A real ESIC ECR's member table (confirmed against an actual sample)
    labels the name column tersely as "IP Name" — not "Name", "Insured
    Name", or "Employee Name" as first assumed — so the match is broadened
    to any header containing "name" once the more specific columns
    (IP Number, Wages, Contribution) have already claimed theirs."""
    indices = {}
    for i, cell in enumerate(header_row):
        if not cell:
            continue
        text = str(cell).strip().lower()
        if ("ip" in text and ("no" in text or "number" in text)) and "ip" not in indices:
            indices["ip_number"] = i
        elif "wage" in text and "ip" not in indices.get("wages", ""):
            indices["wages"] = i
        elif "contri" in text and ("ip" in text or "employee" in text):
            indices["ip_contribution"] = i
        elif "name" in text and "name" not in indices:
            indices["name"] = i
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


def _extract_from_table(table: list, page_index: int) -> list[EsicEcrRecord]:
    header_indices = _find_header_indices(table[0])
    if "ip_number" not in header_indices:
        return []

    records = []
    for row in table[1:]:
        if not row or header_indices["ip_number"] >= len(row):
            continue
        ip_number = normalize_identifier(row[header_indices["ip_number"]])
        if not ip_number or not re.fullmatch(r"\d{9,10}", ip_number):
            continue

        name = None
        if "name" in header_indices and header_indices["name"] < len(row):
            name = (row[header_indices["name"]] or "").strip() or None

        wages = None
        if "wages" in header_indices and header_indices["wages"] < len(row):
            wages = _parse_amount_cell(row[header_indices["wages"]])

        ip_contribution = None
        if "ip_contribution" in header_indices and header_indices["ip_contribution"] < len(row):
            ip_contribution = _parse_amount_cell(row[header_indices["ip_contribution"]])

        records.append(
            EsicEcrRecord(ip_number=ip_number, name=name, wages=wages, ip_contribution=ip_contribution, page=page_index)
        )
    return records


def _extract_from_text_fallback(text: str, page_index: int) -> list[EsicEcrRecord]:
    records = []
    for line in text.splitlines():
        match = IP_NUMBER_PATTERN.search(line)
        if not match:
            continue
        ip_number = match.group(1)
        remainder = line.replace(ip_number, "", 1)
        amounts = AMOUNT_PATTERN.findall(remainder)
        ip_contribution = None
        if amounts:
            # Contribution is typically the last numeric column on an
            # ESIC ECR line (wages usually precede it) — heuristic only.
            try:
                ip_contribution = round(float(amounts[-1].replace(",", "")), 2)
            except ValueError:
                ip_contribution = None
        name = AMOUNT_PATTERN.sub("", remainder).strip(" -|\t") or None
        records.append(EsicEcrRecord(ip_number=ip_number, name=name, wages=None, ip_contribution=ip_contribution, page=page_index))
    return records


def _ocr_page_text(page) -> str | None:
    try:
        import pytesseract

        image = page.to_image(resolution=300).original
        return pytesseract.image_to_string(image)
    except Exception:  # noqa: BLE001 - missing Tesseract binary, etc.
        return None


def parse_esic_ecr(file_path: str) -> ParseResult:
    records: list[EsicEcrRecord] = []
    document_errors: list[str] = []
    used_fallback = False
    used_ocr = False

    try:
        with pdfplumber.open(file_path) as pdf:
            if len(pdf.pages) == 0:
                return ParseResult(document_errors=["ESIC ECR PDF has no pages."], is_reliable=False)

            for page_index, page in enumerate(pdf.pages, start=1):
                page_records: list[EsicEcrRecord] = []
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
        return ParseResult(document_errors=[f"Could not read ESIC ECR PDF: {exc}"], is_reliable=False)

    if not records:
        return ParseResult(
            document_errors=document_errors or ["No ESIC ECR records found in the document."],
            is_reliable=False,
        )

    return ParseResult(rows=records, document_errors=document_errors, is_reliable=not used_fallback, used_ocr=used_ocr)