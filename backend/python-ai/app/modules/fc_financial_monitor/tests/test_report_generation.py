import csv

from openpyxl import load_workbook

from app.modules.fc_financial_monitor.reports.csv_report import generate_csv_report
from app.modules.fc_financial_monitor.reports.excel_report import generate_excel_report

DAILY_RECORDS = [
    {
        "date": "2026-01-01",
        "fcId": None,
        "fcName": "Alpha",
        "revenue": 100000.0,
        "costAmounts": {
            "manpower_cost": 22000.0,
            "packaging_cost": 10000.0,
            "power_and_fuel": 5000.0,
            "fc_rent": 20000.0,
            "equipment_rentals": 5000.0,
            "overheads": 16000.0,
        },
        "costPercentages": {
            "manpower_cost": 22.0,
            "packaging_cost": 10.0,
            "power_and_fuel": 5.0,
            "fc_rent": 20.0,
            "equipment_rentals": 5.0,
            "overheads": 16.0,
        },
        "cm1": 68000.0,
        "cm1Percentage": 68.0,
        "cm2": 22000.0,
        "cm2Percentage": 22.0,
        "overallStatus": "GREEN",
    },
    {
        "date": "2026-01-01",
        "fcId": None,
        "fcName": "Beta",
        "revenue": 100000.0,
        "costAmounts": {
            "manpower_cost": 30000.0,
            "packaging_cost": 10000.0,
            "power_and_fuel": 15000.0,
            "fc_rent": 20000.0,
            "equipment_rentals": 5000.0,
            "overheads": 15000.0,
        },
        "costPercentages": {
            "manpower_cost": 30.0,
            "packaging_cost": 10.0,
            "power_and_fuel": 15.0,
            "fc_rent": 20.0,
            "equipment_rentals": 5.0,
            "overheads": 15.0,
        },
        "cm1": 60000.0,
        "cm1Percentage": 60.0,
        "cm2": 5000.0,
        "cm2Percentage": 5.0,
        "overallStatus": "RED",
    },
]

ANOMALIES = [
    {
        "date": "2026-01-01",
        "fcId": None,
        "fcName": "Beta",
        "metric": "CM2",
        "actualValue": 5.0,
        "targetRange": {"minimum": 15, "maximum": 30, "source": "specification"},
        "deviation": -10.0,
        "financialImpact": -10000.0,
        "severity": "CRITICAL",
        "status": "OPEN",
    }
]

INSIGHTS = [
    {
        "fcName": "Beta",
        "date": "2026-01-01",
        "summary": "On January 1, CM2 was 5.0%, below the expected range.",
        "topContributors": [{"metric": "Power & Fuel", "actualValue": 15.0, "deviation": 9.0, "financialImpact": 9000.0}],
        "recommendedAction": "Review power & fuel spend.",
    }
]

TARGETS = {
    "cm1": {"minimum": 65, "maximum": 70, "source": "specification"},
    "cm2": {"minimum": 15, "maximum": 30, "source": "specification"},
}


def test_excel_report_has_all_five_sheets(tmp_path):
    output_path = tmp_path / "report.xlsx"
    generate_excel_report("batch-1", DAILY_RECORDS, ANOMALIES, INSIGHTS, TARGETS, str(output_path))

    wb = load_workbook(output_path)
    assert wb.sheetnames == [
        "Executive Summary",
        "FC Daily P&L",
        "Anomaly Log",
        "Insights and Recommendations",
        "Target Configuration",
    ]


def test_executive_summary_counts_are_correct(tmp_path):
    output_path = tmp_path / "report.xlsx"
    generate_excel_report("batch-1", DAILY_RECORDS, ANOMALIES, INSIGHTS, TARGETS, str(output_path))

    wb = load_workbook(output_path)
    summary = wb["Executive Summary"]
    values = {row[0].value: row[1].value for row in summary.iter_rows() if row[0].value}
    assert values["Total FCs"] == 2
    assert values["Total Revenue"] == 200000.0
    assert values["Red FCs"] == 1
    assert values["Green FCs"] == 1
    assert values["Total Anomalies"] == 1


def test_daily_pnl_sheet_contains_real_data_only(tmp_path):
    output_path = tmp_path / "report.xlsx"
    generate_excel_report("batch-1", DAILY_RECORDS, ANOMALIES, INSIGHTS, TARGETS, str(output_path))

    wb = load_workbook(output_path)
    sheet = wb["FC Daily P&L"]
    fc_names = [row[1].value for row in sheet.iter_rows(min_row=2)]
    assert fc_names == ["Alpha", "Beta"]


def test_csv_report_matches_excel_data(tmp_path):
    output_path = tmp_path / "report.csv"
    generate_csv_report(DAILY_RECORDS, str(output_path))

    with open(output_path) as f:
        rows = list(csv.reader(f))
    assert rows[0][1] == "FC"
    assert rows[1][1] == "Alpha"
    assert rows[2][1] == "Beta"
