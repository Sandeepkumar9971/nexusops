from openpyxl import load_workbook

from app.modules.employee_compliance.reports.excel_report import generate_excel_report
from app.modules.employee_compliance.verification import statuses

SAMPLE_EMPLOYEES = [
    {
        "employee": {"name": "Ravi Kumar", "uan": "100000000001", "ipNumber": "9000000001", "agency": "Agency A", "state": "Karnataka"},
        "wagesheet": {"pfAmount": 1200.0, "esicAmount": 75.0},
        "pf": {"wagesheetAmount": 1200.0, "ecrAmount": 1200.0, "difference": 0.0, "status": statuses.MATCHED, "reason": "ok"},
        "esic": {"wagesheetAmount": 75.0, "ecrAmount": 75.0, "difference": 0.0, "status": statuses.MATCHED, "reason": "ok"},
    },
    {
        "employee": {"name": "Suresh Babu", "uan": "100000000002", "ipNumber": "9000000002", "agency": "Agency A", "state": "Karnataka"},
        "wagesheet": {"pfAmount": 1500.0, "esicAmount": 93.75},
        "pf": {"wagesheetAmount": 1500.0, "ecrAmount": 1200.0, "difference": 300.0, "status": statuses.AMOUNT_MISMATCH, "reason": "diff"},
        "esic": {"wagesheetAmount": 93.75, "ecrAmount": 93.75, "difference": 0.0, "status": statuses.MATCHED, "reason": "ok"},
    },
    {
        "employee": {"name": "Manoj Yadav", "uan": "100000000006", "ipNumber": "9000000006", "agency": "Agency C", "state": "Maharashtra"},
        "wagesheet": {"pfAmount": 1400.0, "esicAmount": 87.5},
        "pf": {"wagesheetAmount": 1400.0, "ecrAmount": None, "difference": None, "status": statuses.MISSING, "reason": "not found"},
        "esic": {"wagesheetAmount": 87.5, "ecrAmount": 87.5, "difference": 0.0, "status": statuses.MATCHED, "reason": "ok"},
    },
]


def test_generates_all_four_sheets(tmp_path):
    output_path = tmp_path / "report.xlsx"
    generate_excel_report("batch-123", SAMPLE_EMPLOYEES, str(output_path))

    wb = load_workbook(output_path)
    assert wb.sheetnames == ["Summary", "Employee-wise Verification", "PF Exceptions", "ESIC Exceptions"]


def test_summary_sheet_has_correct_counts(tmp_path):
    output_path = tmp_path / "report.xlsx"
    generate_excel_report("batch-123", SAMPLE_EMPLOYEES, str(output_path))

    wb = load_workbook(output_path)
    summary = wb["Summary"]
    values = {row[0].value: row[1].value for row in summary.iter_rows() if row[0].value}
    assert values["Total Employees"] == 3
    assert values["PF — Matched"] == 1
    assert values["PF — Amount Mismatch"] == 1
    assert values["PF — Missing"] == 1
    assert values["ESIC — Matched"] == 3


def test_employee_sheet_contains_real_data_only(tmp_path):
    output_path = tmp_path / "report.xlsx"
    generate_excel_report("batch-123", SAMPLE_EMPLOYEES, str(output_path))

    wb = load_workbook(output_path)
    sheet = wb["Employee-wise Verification"]
    names_in_sheet = [row[0].value for row in sheet.iter_rows(min_row=2)]
    assert names_in_sheet == ["Ravi Kumar", "Suresh Babu", "Manoj Yadav"]


def test_pf_exceptions_sheet_excludes_matched_records(tmp_path):
    output_path = tmp_path / "report.xlsx"
    generate_excel_report("batch-123", SAMPLE_EMPLOYEES, str(output_path))

    wb = load_workbook(output_path)
    sheet = wb["PF Exceptions"]
    names_in_sheet = [row[0].value for row in sheet.iter_rows(min_row=2) if row[0].value]
    # Ravi Kumar's PF is MATCHED — must not appear in the exceptions sheet.
    assert "Ravi Kumar" not in names_in_sheet
    assert "Suresh Babu" in names_in_sheet  # AMOUNT_MISMATCH
    assert "Manoj Yadav" in names_in_sheet  # MISSING
