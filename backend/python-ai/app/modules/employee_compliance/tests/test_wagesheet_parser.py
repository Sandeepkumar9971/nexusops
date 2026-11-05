from openpyxl import Workbook

from app.modules.employee_compliance.parsers.wagesheet_parser import parse_wagesheet
from app.modules.employee_compliance.tests.conftest import WAGESHEET_EMPLOYEES


def test_parses_all_employee_rows(wagesheet_path):
    result = parse_wagesheet(wagesheet_path)
    assert result.document_errors == []
    assert len(result.rows) == len(WAGESHEET_EMPLOYEES)


def test_maps_real_column_headers_correctly(wagesheet_path):
    result = parse_wagesheet(wagesheet_path)
    first = result.rows[0]
    assert first.name == "Ravi Kumar"
    assert first.uan == "100000000001"
    assert first.ip_number == "9000000001"
    assert first.pf_amount == 1200.00
    assert first.esic_amount == 75.00


def test_tolerates_header_name_variation(tmp_path):
    """Real vendors phrase headers slightly differently — this must not
    require an exact string match."""
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Employee Name", "UAN No", "IP No", "Vendor", "State", "ESIC(0.75%)", "PF(12%)"])
    sheet.append(["Test Employee", "100000000099", "9000000099", "Agency X", "Delhi", 50.0, 800.0])
    path = tmp_path / "variant.xlsx"
    wb.save(path)

    result = parse_wagesheet(str(path))
    assert result.document_errors == []
    assert result.rows[0].name == "Test Employee"
    assert result.rows[0].pf_amount == 800.0
    assert result.rows[0].esic_amount == 50.0


def test_missing_required_column_is_reported_not_silently_dropped(tmp_path):
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Name", "Agency", "State"])  # no UAN/IP/amount columns at all
    sheet.append(["Someone", "Agency X", "Delhi"])
    path = tmp_path / "broken.xlsx"
    wb.save(path)

    result = parse_wagesheet(str(path))
    assert result.is_reliable is False
    assert result.rows == []
    assert any("uan" in e.lower() for e in result.document_errors)


def test_blank_name_and_missing_identifiers_are_flagged_not_discarded(tmp_path):
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Name", "UAN", "IP Number", "Agency", "State", "ESIC @ 0.75%", "PF @ 12%"])
    sheet.append(["", "", "9000000050", "Agency X", "Delhi", 50.0, 800.0])
    path = tmp_path / "incomplete.xlsx"
    wb.save(path)

    result = parse_wagesheet(str(path))
    assert len(result.rows) == 1
    row = result.rows[0]
    assert "blank employee name" in row.errors
    assert "missing UAN" in row.errors


def test_invalid_and_negative_amounts_are_flagged(tmp_path):
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Name", "UAN", "IP Number", "Agency", "State", "ESIC @ 0.75%", "PF @ 12%"])
    sheet.append(["Bad Amount", "100000000051", "9000000051", "Agency X", "Delhi", "not-a-number", -50])
    path = tmp_path / "bad_amounts.xlsx"
    wb.save(path)

    result = parse_wagesheet(str(path))
    row = result.rows[0]
    assert row.esic_amount is None
    assert row.pf_amount is None
    assert any("invalid numeric amount" in e for e in row.errors)
    assert any("negative amount" in e for e in row.errors)


def test_duplicate_uan_is_flagged(tmp_path):
    wb = Workbook()
    sheet = wb.active
    sheet.append(["Name", "UAN", "IP Number", "Agency", "State", "ESIC @ 0.75%", "PF @ 12%"])
    sheet.append(["Person One", "100000000060", "9000000060", "Agency X", "Delhi", 50.0, 800.0])
    sheet.append(["Person Two", "100000000060", "9000000061", "Agency X", "Delhi", 50.0, 800.0])
    path = tmp_path / "dup.xlsx"
    wb.save(path)

    result = parse_wagesheet(str(path))
    assert any("duplicate UAN" in e for e in result.rows[1].errors)


def test_empty_workbook_is_reported(tmp_path):
    wb = Workbook()
    path = tmp_path / "empty.xlsx"
    wb.save(path)

    result = parse_wagesheet(str(path))
    assert result.is_reliable is False
    assert result.rows == []


def test_corrupt_file_is_reported_not_crashed(tmp_path):
    path = tmp_path / "corrupt.xlsx"
    path.write_bytes(b"this is not a real excel file")

    result = parse_wagesheet(str(path))
    assert result.is_reliable is False
    assert len(result.document_errors) == 1
