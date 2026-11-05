from datetime import datetime, timezone

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

from app.modules.employee_compliance.verification import statuses

HEADER_FILL = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
HEADER_FONT = Font(color="FFFFFF", bold=True)
MISMATCH_STATUSES = {statuses.NAME_MISMATCH, statuses.AMOUNT_MISMATCH, statuses.MISSING}


def _write_header(sheet, headers: list[str], row: int = 1):
    for col_idx, header in enumerate(headers, start=1):
        cell = sheet.cell(row=row, column=col_idx, value=header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
    sheet.freeze_panes = sheet.cell(row=row + 1, column=1)


def _autosize_columns(sheet, widths: list[int]):
    for idx, width in enumerate(widths, start=1):
        sheet.column_dimensions[get_column_letter(idx)].width = width


def _count_statuses(employees: list[dict], key: str) -> dict:
    counts = {s: 0 for s in (statuses.MATCHED, statuses.NAME_MISMATCH, statuses.AMOUNT_MISMATCH, statuses.MISSING, statuses.NEEDS_REVIEW)}
    for emp in employees:
        status = emp.get(key, {}).get("status")
        if status in counts:
            counts[status] += 1
    return counts


def _build_summary_sheet(wb: Workbook, batch_id: str, employees: list[dict]):
    sheet = wb.active
    sheet.title = "Summary"

    pf_counts = _count_statuses(employees, "pf")
    esic_counts = _count_statuses(employees, "esic")
    needs_review_total = pf_counts[statuses.NEEDS_REVIEW] + esic_counts[statuses.NEEDS_REVIEW]

    rows = [
        ("Batch ID", batch_id),
        ("Verification Date", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")),
        ("Total Employees", len(employees)),
        ("", ""),
        ("PF — Matched", pf_counts[statuses.MATCHED]),
        ("PF — Name Mismatch", pf_counts[statuses.NAME_MISMATCH]),
        ("PF — Amount Mismatch", pf_counts[statuses.AMOUNT_MISMATCH]),
        ("PF — Missing", pf_counts[statuses.MISSING]),
        ("PF — Needs Review", pf_counts[statuses.NEEDS_REVIEW]),
        ("", ""),
        ("ESIC — Matched", esic_counts[statuses.MATCHED]),
        ("ESIC — Name Mismatch", esic_counts[statuses.NAME_MISMATCH]),
        ("ESIC — Amount Mismatch", esic_counts[statuses.AMOUNT_MISMATCH]),
        ("ESIC — Missing", esic_counts[statuses.MISSING]),
        ("ESIC — Needs Review", esic_counts[statuses.NEEDS_REVIEW]),
        ("", ""),
        ("Total Needs Review (PF + ESIC)", needs_review_total),
    ]
    for row_idx, (label, value) in enumerate(rows, start=1):
        sheet.cell(row=row_idx, column=1, value=label).font = Font(bold=bool(label) and not label.startswith(" "))
        sheet.cell(row=row_idx, column=2, value=value)
    _autosize_columns(sheet, [32, 20])


def _build_employee_sheet(wb: Workbook, employees: list[dict]):
    sheet = wb.create_sheet("Employee-wise Verification")
    headers = [
        "Employee Name",
        "UAN",
        "IP Number",
        "Agency",
        "State",
        "Wagesheet PF",
        "PF ECR EE Share",
        "PF Difference",
        "PF Status",
        "PF Reason",
        "Wagesheet ESIC",
        "ESIC ECR IP Contribution",
        "ESIC Difference",
        "ESIC Status",
        "ESIC Reason",
    ]
    _write_header(sheet, headers)

    for row_idx, emp in enumerate(employees, start=2):
        info = emp.get("employee", {})
        pf = emp.get("pf", {}) or {}
        esic = emp.get("esic", {}) or {}
        values = [
            info.get("name"),
            info.get("uan"),
            info.get("ipNumber"),
            info.get("agency"),
            info.get("state"),
            pf.get("wagesheetAmount"),
            pf.get("ecrAmount"),
            pf.get("difference"),
            pf.get("status"),
            pf.get("reason"),
            esic.get("wagesheetAmount"),
            esic.get("ecrAmount"),
            esic.get("difference"),
            esic.get("status"),
            esic.get("reason"),
        ]
        for col_idx, value in enumerate(values, start=1):
            sheet.cell(row=row_idx, column=col_idx, value=value)

    for amount_col in (6, 7, 8, 11, 12, 13):
        for row_idx in range(2, len(employees) + 2):
            sheet.cell(row=row_idx, column=amount_col).number_format = "#,##0.00"

    sheet.auto_filter.ref = sheet.dimensions
    _autosize_columns(sheet, [24, 14, 14, 16, 12, 13, 15, 13, 36, 13, 18, 13, 13, 36])


def _build_exceptions_sheet(wb: Workbook, employees: list[dict], title: str, key: str):
    sheet = wb.create_sheet(title)
    headers = ["Employee Name", "UAN" if key == "pf" else "IP Number", "Status", "Wagesheet Amount", "ECR Amount", "Difference", "Reason"]
    _write_header(sheet, headers)

    row_idx = 2
    for emp in employees:
        verification = emp.get(key, {}) or {}
        if verification.get("status") not in MISMATCH_STATUSES | {statuses.NEEDS_REVIEW}:
            continue
        info = emp.get("employee", {})
        identifier = info.get("uan") if key == "pf" else info.get("ipNumber")
        values = [
            info.get("name"),
            identifier,
            verification.get("status"),
            verification.get("wagesheetAmount"),
            verification.get("ecrAmount"),
            verification.get("difference"),
            verification.get("reason"),
        ]
        for col_idx, value in enumerate(values, start=1):
            sheet.cell(row=row_idx, column=col_idx, value=value)
        row_idx += 1

    if row_idx > 2:
        sheet.auto_filter.ref = f"A1:G{row_idx - 1}"
    _autosize_columns(sheet, [24, 16, 18, 16, 14, 13, 40])


def generate_excel_report(batch_id: str, employees: list[dict], output_path: str) -> None:
    """Builds the 4-sheet workbook (Summary, Employee-wise Verification,
    PF Exceptions, ESIC Exceptions) from already-verified employee records
    — exports only real processed data, never recomputes or guesses."""
    wb = Workbook()
    _build_summary_sheet(wb, batch_id, employees)
    _build_employee_sheet(wb, employees)
    _build_exceptions_sheet(wb, employees, "PF Exceptions", "pf")
    _build_exceptions_sheet(wb, employees, "ESIC Exceptions", "esic")
    wb.save(output_path)
