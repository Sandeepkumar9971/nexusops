from datetime import datetime, timezone

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

HEADER_FILL = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
HEADER_FONT = Font(color="FFFFFF", bold=True)

COST_FIELDS = [
    ("manpower_cost", "Manpower Cost"),
    ("packaging_cost", "Packaging Cost"),
    ("power_and_fuel", "Power & Fuel"),
    ("fc_rent", "FC Rent"),
    ("equipment_rentals", "Equipment Rentals"),
    ("overheads", "Overheads"),
]


def _write_header(sheet, headers: list[str], row: int = 1):
    for col_idx, header in enumerate(headers, start=1):
        cell = sheet.cell(row=row, column=col_idx, value=header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
    sheet.freeze_panes = sheet.cell(row=row + 1, column=1)


def _autosize_columns(sheet, widths: list[int]):
    for idx, width in enumerate(widths, start=1):
        sheet.column_dimensions[get_column_letter(idx)].width = width


def _build_executive_summary_sheet(wb: Workbook, batch_id: str, daily_records: list[dict], anomalies: list[dict]):
    sheet = wb.active
    sheet.title = "Executive Summary"

    fc_ids = {r["fcId"] or r["fcName"] for r in daily_records}
    total_revenue = sum(r["revenue"] for r in daily_records)
    cm1_values = [r["cm1Percentage"] for r in daily_records if r.get("cm1Percentage") is not None]
    cm2_values = [r["cm2Percentage"] for r in daily_records if r.get("cm2Percentage") is not None]
    status_counts = {"RED": 0, "YELLOW": 0, "GREEN": 0, "BLUE": 0, "UNKNOWN": 0}
    for r in daily_records:
        status_counts[r.get("overallStatus", "UNKNOWN")] = status_counts.get(r.get("overallStatus", "UNKNOWN"), 0) + 1

    rows = [
        ("Batch ID", batch_id),
        ("Reporting Date", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")),
        ("Total FCs", len(fc_ids)),
        ("Total Records", len(daily_records)),
        ("Total Revenue", round(total_revenue, 2)),
        ("Average CM1 %", round(sum(cm1_values) / len(cm1_values), 2) if cm1_values else "N/A"),
        ("Average CM2 %", round(sum(cm2_values) / len(cm2_values), 2) if cm2_values else "N/A"),
        ("", ""),
        ("Red FCs", status_counts["RED"]),
        ("Yellow FCs", status_counts["YELLOW"]),
        ("Green FCs", status_counts["GREEN"]),
        ("Blue FCs", status_counts["BLUE"]),
        ("", ""),
        ("Total Anomalies", len(anomalies)),
    ]
    for row_idx, (label, value) in enumerate(rows, start=1):
        sheet.cell(row=row_idx, column=1, value=label).font = Font(bold=bool(label))
        sheet.cell(row=row_idx, column=2, value=value)
    _autosize_columns(sheet, [24, 22])


def _build_daily_pnl_sheet(wb: Workbook, daily_records: list[dict]):
    sheet = wb.create_sheet("FC Daily P&L")
    headers = (
        ["Date", "FC", "Revenue"]
        + [label for _, label in COST_FIELDS]
        + [f"{label} %" for _, label in COST_FIELDS]
        + ["CM1", "CM1 %", "CM2", "CM2 %", "Status"]
    )
    _write_header(sheet, headers)

    for row_idx, record in enumerate(daily_records, start=2):
        values = (
            [record["date"], record["fcName"] or record["fcId"], record["revenue"]]
            + [record["costAmounts"].get(key) for key, _ in COST_FIELDS]
            + [record["costPercentages"].get(key) for key, _ in COST_FIELDS]
            + [record["cm1"], record["cm1Percentage"], record["cm2"], record["cm2Percentage"], record["overallStatus"]]
        )
        for col_idx, value in enumerate(values, start=1):
            sheet.cell(row=row_idx, column=col_idx, value=value)

    amount_cols = [3] + list(range(4, 4 + len(COST_FIELDS))) + [3 + len(COST_FIELDS) * 2 + 1, 3 + len(COST_FIELDS) * 2 + 3]
    for col in amount_cols:
        for row_idx in range(2, len(daily_records) + 2):
            sheet.cell(row=row_idx, column=col).number_format = "#,##0.00"
    percent_cols = list(range(4 + len(COST_FIELDS), 4 + len(COST_FIELDS) * 2)) + [
        3 + len(COST_FIELDS) * 2 + 2,
        3 + len(COST_FIELDS) * 2 + 4,
    ]
    for col in percent_cols:
        for row_idx in range(2, len(daily_records) + 2):
            sheet.cell(row_idx, col).number_format = "0.00"

    sheet.auto_filter.ref = sheet.dimensions
    _autosize_columns(sheet, [12, 20] + [14] * len(COST_FIELDS) + [12] * len(COST_FIELDS) + [12] * 4 + [10])


def _build_anomaly_log_sheet(wb: Workbook, anomalies: list[dict]):
    sheet = wb.create_sheet("Anomaly Log")
    headers = ["Date", "FC", "Line Item", "% of Revenue", "Target Range", "Deviation", "Financial Impact", "Severity", "Status"]
    _write_header(sheet, headers)

    for row_idx, anomaly in enumerate(anomalies, start=2):
        target = anomaly.get("targetRange") or {}
        target_str = f"{target.get('minimum')}–{target.get('maximum')}" if target.get("minimum") is not None else "Not configured"
        values = [
            anomaly["date"],
            anomaly["fcName"] or anomaly["fcId"],
            anomaly["metric"],
            anomaly["actualValue"],
            target_str,
            anomaly["deviation"],
            anomaly["financialImpact"],
            anomaly["severity"],
            anomaly["status"],
        ]
        for col_idx, value in enumerate(values, start=1):
            sheet.cell(row=row_idx, column=col_idx, value=value)

    if len(anomalies) > 0:
        sheet.auto_filter.ref = sheet.dimensions
    _autosize_columns(sheet, [12, 20, 18, 11, 16, 12, 16, 11, 14])


def _build_insights_sheet(wb: Workbook, insights: list[dict]):
    sheet = wb.create_sheet("Insights and Recommendations")
    headers = ["FC", "Date", "Summary", "Top Contributors", "Recommended Action"]
    _write_header(sheet, headers)

    for row_idx, insight in enumerate(insights, start=2):
        contributors = ", ".join(
            f"{c['metric']} ({c['actualValue']:.1f}%)" for c in insight.get("topContributors", [])
        )
        values = [insight["fcName"], insight["date"], insight["summary"], contributors, insight["recommendedAction"]]
        for col_idx, value in enumerate(values, start=1):
            sheet.cell(row=row_idx, column=col_idx, value=value)

    if len(insights) > 0:
        sheet.auto_filter.ref = sheet.dimensions
    _autosize_columns(sheet, [20, 12, 60, 40, 50])


def _build_target_configuration_sheet(wb: Workbook, targets: dict):
    sheet = wb.create_sheet("Target Configuration")
    headers = ["Metric", "Minimum", "Maximum", "Configuration Source"]
    _write_header(sheet, headers)

    for row_idx, (metric, target) in enumerate(targets.items(), start=2):
        values = [metric, target.get("minimum"), target.get("maximum"), target.get("source")]
        for col_idx, value in enumerate(values, start=1):
            sheet.cell(row=row_idx, column=col_idx, value=value)

    sheet.auto_filter.ref = sheet.dimensions
    _autosize_columns(sheet, [22, 12, 12, 22])


def generate_excel_report(batch_id: str, daily_records: list[dict], anomalies: list[dict], insights: list[dict], targets: dict, output_path: str) -> None:
    """Builds the 5-sheet workbook from already-computed, already-persisted
    results — exports real processed data only, never recomputes figures."""
    wb = Workbook()
    _build_executive_summary_sheet(wb, batch_id, daily_records, anomalies)
    _build_daily_pnl_sheet(wb, daily_records)
    _build_anomaly_log_sheet(wb, anomalies)
    _build_insights_sheet(wb, insights)
    _build_target_configuration_sheet(wb, targets)
    wb.save(output_path)
