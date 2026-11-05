"""Synthetic test fixtures for Employee Compliance Verification.

None of this is real company/employee data — every name, UAN, and IP
Number here is fabricated specifically to exercise one verification
scenario each (see the comment on each row below). Name-similarity scores
were measured against the real matcher before being assigned to a scenario
(see the project's dev notes) rather than guessed, so each row reliably
lands in the status band it's meant to test.
"""

import pytest
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

# Each tuple: (name, uan, ip_number, agency, state, pf_amount, esic_amount)
WAGESHEET_EMPLOYEES = [
    ("Ravi Kumar", "100000000001", "9000000001", "Agency A", "Karnataka", 1200.00, 75.00),
    ("Suresh Babu", "100000000002", "9000000002", "Agency A", "Karnataka", 1500.00, 93.75),
    ("Lakshmi Devi", "100000000003", "9000000003", "Agency B", "Tamil Nadu", 1000.00, 62.50),
    ("Anita Sharma", "100000000004", "9000000004", "Agency B", "Tamil Nadu", 1100.00, 68.75),
    ("Deepak Singh", "100000000005", "9000000005", "Agency A", "Karnataka", 1300.00, 81.25),
    ("Manoj Yadav", "100000000006", "9000000006", "Agency C", "Maharashtra", 1400.00, 87.50),
    ("Pooja Nair", "100000000007", "9000000007", "Agency C", "Maharashtra", 1250.00, 78.13),
    ("Mohd Irfan Khan", "100000000008", "9000000008", "Agency A", "Karnataka", 1600.00, 100.00),
    ("Sunita Rani", "100000000009", "9000000009", "Agency B", "Tamil Nadu", 1100.00, 68.75),
    ("Ramesh Chandra", "100000000010", "9000000010", "Agency C", "Maharashtra", 1350.00, 84.38),
]

# (uan, name, ee_share) — UAN 6 (Manoj Yadav) deliberately absent: MISSING.
# UAN 9 (Sunita Rani) appears twice: duplicate identifier -> NEEDS_REVIEW.
PF_ECR_RECORDS = [
    ("100000000001", "Ravi Kumar", 1200.00),  # matches exactly
    ("100000000002", "Suresh Babu", 1200.00),  # amount mismatch (wagesheet 1500)
    ("100000000003", "Lakshmi Devi", 1000.00),  # matches
    ("100000000004", "Ramesh Gupta", 1100.00),  # name mismatch (genuinely different name)
    ("100000000005", "Deepak Singh", 1300.00),  # matches
    # 100000000006 intentionally missing
    ("100000000007", "Pooja Nair", 1250.00),  # matches
    ("100000000008", "Mohammed Irfan Khan", 1600.00),  # minor spelling variation -> review
    ("100000000009", "Sunita Rani", 1100.00),  # duplicate #1
    ("100000000009", "Sunita Rani", 1150.00),  # duplicate #2 -> ambiguous
    ("100000000010", "Ramesh Chandra", 1350.00),  # matches
]

# (ip_number, name, wages, ip_contribution) — IP 7 (Pooja Nair) absent: MISSING.
ESIC_ECR_RECORDS = [
    ("9000000001", "Ravi Kumar", 10000.00, 75.00),  # matches
    ("9000000002", "Suresh Babu", 12500.00, 93.75),  # matches
    ("9000000003", "Lakshmi Devi", 8333.00, 50.00),  # amount mismatch (wagesheet 62.50)
    ("9000000004", "Anita Sharma", 9167.00, 68.75),  # matches
    ("9000000005", "Vijay Kumar", 10833.00, 81.25),  # name mismatch (genuinely different name)
    ("9000000006", "Manoj Yadav", 11667.00, 87.50),  # matches
    # 9000000007 intentionally missing
    ("9000000008", "Mohd Irfan Khan", 13333.00, 100.00),  # matches exactly
    ("9000000009", "Sunita Rani", 9167.00, 68.75),  # matches
    ("9000000010", "Ramesh C", 11250.00, 84.38),  # truncated name -> manual review
]


def _build_wagesheet_workbook(path):
    wb = Workbook()
    sheet = wb.active
    sheet.title = "Wagesheet"
    sheet.append(["Name", "UAN", "IP Number", "Agency", "State", "ESIC @ 0.75%", "PF @ 12%"])
    for name, uan, ip_number, agency, state, pf_amount, esic_amount in WAGESHEET_EMPLOYEES:
        sheet.append([name, uan, ip_number, agency, state, esic_amount, pf_amount])
    wb.save(path)


def _build_pf_ecr_pdf(path):
    doc = SimpleDocTemplate(str(path), pagesize=A4)
    data = [["UAN", "Member Name", "EPF Contri (EE Share)"]]
    data += [[uan, name, f"{ee_share:.2f}"] for uan, name, ee_share in PF_ECR_RECORDS]
    table = Table(data)
    table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, "black"), ("BACKGROUND", (0, 0), (-1, 0), "#DDDDDD")]))
    doc.build([table])


def _build_esic_ecr_pdf(path):
    doc = SimpleDocTemplate(str(path), pagesize=A4)
    data = [["IP Number", "Employee Name", "Wages", "Employee Contribution"]]
    data += [[ip, name, f"{wages:.2f}", f"{contrib:.2f}"] for ip, name, wages, contrib in ESIC_ECR_RECORDS]
    table = Table(data)
    table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, "black"), ("BACKGROUND", (0, 0), (-1, 0), "#DDDDDD")]))
    doc.build([table])


@pytest.fixture
def wagesheet_path(tmp_path):
    path = tmp_path / "wagesheet.xlsx"
    _build_wagesheet_workbook(path)
    return str(path)


@pytest.fixture
def pf_ecr_path(tmp_path):
    path = tmp_path / "pf_ecr.pdf"
    _build_pf_ecr_pdf(path)
    return str(path)


@pytest.fixture
def esic_ecr_path(tmp_path):
    path = tmp_path / "esic_ecr.pdf"
    _build_esic_ecr_pdf(path)
    return str(path)
