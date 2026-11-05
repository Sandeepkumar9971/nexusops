import csv

from app.modules.fc_financial_monitor.reports.excel_report import COST_FIELDS


def generate_csv_report(daily_records: list, output_path: str) -> None:
    """Flat FC Daily P&L export — same underlying data as the Excel
    workbook's 'FC Daily P&L' sheet, for tools that only take CSV."""
    headers = (
        ["Date", "FC", "Revenue"]
        + [label for _, label in COST_FIELDS]
        + [f"{label} %" for _, label in COST_FIELDS]
        + ["CM1", "CM1 %", "CM2", "CM2 %", "Status"]
    )

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for record in daily_records:
            writer.writerow(
                [record["date"], record["fcName"] or record["fcId"], record["revenue"]]
                + [record["costAmounts"].get(key) for key, _ in COST_FIELDS]
                + [record["costPercentages"].get(key) for key, _ in COST_FIELDS]
                + [record["cm1"], record["cm1Percentage"], record["cm2"], record["cm2Percentage"], record["overallStatus"]]
            )
