import csv

from openpyxl import Workbook

from app.modules.fc_financial_monitor.parsers.financial_parser import parse_financial_file


def test_parses_valid_excel_workbook(financial_workbook_path):
    result = parse_financial_file(financial_workbook_path)
    assert len(result.rows) == 4
    assert not result.document_errors
    fc_names = {r.fc_name for r in result.rows}
    assert fc_names == {"Alpha", "Beta", "Gamma", "Delta"}


def test_parses_valid_csv(financial_csv_path):
    result = parse_financial_file(financial_csv_path)
    assert len(result.rows) == 4
    assert not result.document_errors


def test_empty_file_is_rejected(tmp_path):
    path = tmp_path / "empty.xlsx"
    wb = Workbook()
    wb.active.title = "Empty"
    wb.save(path)
    result = parse_financial_file(str(path))
    assert not result.rows
    assert any("empty" in e.lower() for e in result.document_errors)


def test_missing_required_column_is_rejected(tmp_path):
    path = tmp_path / "missing_col.xlsx"
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Day", "FC Name", "Revenue", "Manpower Cost"])  # missing most cost columns
    sheet.append(["2026-01-01", "Alpha", 100000, 20000])
    wb.save(path)
    result = parse_financial_file(str(path))
    assert not result.rows
    assert any("missing required column" in e.lower() for e in result.document_errors)


def test_missing_fc_identifier_column_is_rejected(tmp_path):
    path = tmp_path / "no_fc.xlsx"
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Day", "Revenue", "Manpower Cost", "Packaging Cost", "Power & Fuel", "FC Rent", "Equipment Rentals", "Overheads"])
    sheet.append(["2026-01-01", 100000, 20000, 10000, 5000, 20000, 5000, 15000])
    wb.save(path)
    result = parse_financial_file(str(path))
    assert not result.rows
    assert result.fc_identifier_present is False
    assert any("fc identifier" in e.lower() for e in result.document_errors)


def test_corrupt_file_does_not_crash(tmp_path):
    path = tmp_path / "corrupt.xlsx"
    path.write_bytes(b"this is not a real excel file")
    result = parse_financial_file(str(path))
    assert not result.rows
    assert result.document_errors


def test_zero_revenue_is_kept_and_flagged_not_discarded(tmp_path):
    path = tmp_path / "zero_revenue.xlsx"
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Day", "FC Name", "Revenue", "Manpower Cost", "Packaging Cost", "Power & Fuel", "FC Rent", "Equipment Rentals", "Overheads"])
    sheet.append(["2026-01-01", "Echo", 0, 2000, 1000, 500, 2000, 500, 1500])
    wb.save(path)
    result = parse_financial_file(str(path))
    assert len(result.rows) == 1
    assert result.rows[0].revenue == 0
    assert not result.rows[0].errors  # zero revenue is valid input, just unusable as a denominator later


def test_negative_cost_is_flagged_not_discarded(tmp_path):
    path = tmp_path / "negative_cost.xlsx"
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Day", "FC Name", "Revenue", "Manpower Cost", "Packaging Cost", "Power & Fuel", "FC Rent", "Equipment Rentals", "Overheads"])
    sheet.append(["2026-01-01", "Foxtrot", 100000, -5000, 10000, 5000, 20000, 5000, 15000])
    wb.save(path)
    result = parse_financial_file(str(path))
    assert len(result.rows) == 1
    assert any("negative" in e for e in result.rows[0].errors)


def test_invalid_date_is_flagged_not_discarded(tmp_path):
    path = tmp_path / "bad_date.xlsx"
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Day", "FC Name", "Revenue", "Manpower Cost", "Packaging Cost", "Power & Fuel", "FC Rent", "Equipment Rentals", "Overheads"])
    sheet.append(["not-a-date", "Golf", 100000, 20000, 10000, 5000, 20000, 5000, 15000])
    wb.save(path)
    result = parse_financial_file(str(path))
    assert len(result.rows) == 1
    assert any("date" in e for e in result.rows[0].errors)


def test_missing_fc_identifier_value_is_flagged_not_discarded(tmp_path):
    path = tmp_path / "blank_fc.xlsx"
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Day", "FC Name", "Revenue", "Manpower Cost", "Packaging Cost", "Power & Fuel", "FC Rent", "Equipment Rentals", "Overheads"])
    sheet.append(["2026-01-01", "", 100000, 20000, 10000, 5000, 20000, 5000, 15000])
    wb.save(path)
    result = parse_financial_file(str(path))
    assert len(result.rows) == 1
    assert any("fc identifier" in e.lower() for e in result.rows[0].errors)


def test_duplicate_fc_date_is_flagged_on_both_but_both_kept(tmp_path):
    path = tmp_path / "dup.xlsx"
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Day", "FC Name", "Revenue", "Manpower Cost", "Packaging Cost", "Power & Fuel", "FC Rent", "Equipment Rentals", "Overheads"])
    sheet.append(["2026-01-01", "Hotel", 100000, 20000, 10000, 5000, 20000, 5000, 15000])
    sheet.append(["2026-01-01", "Hotel", 100000, 21000, 10000, 5000, 20000, 5000, 15000])
    wb.save(path)
    result = parse_financial_file(str(path))
    assert len(result.rows) == 2  # never silently discarded
    assert any("duplicate" in e for e in result.rows[1].errors)


def test_column_mapping_override_wins_over_autodetection(tmp_path):
    path = tmp_path / "custom_headers.xlsx"
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Date", "Facility", "Total Revenue", "Manpower Cost", "Packaging Cost", "Power & Fuel", "FC Rent", "Equipment Rentals", "Overheads"])
    sheet.append(["2026-01-01", "India-1", 100000, 20000, 10000, 5000, 20000, 5000, 15000])
    wb.save(path)
    result = parse_financial_file(str(path), column_mapping={"revenue": "Total Revenue"})
    assert len(result.rows) == 1
    assert result.rows[0].revenue == 100000
    assert result.rows[0].fc_name == "India-1"
