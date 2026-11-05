from app.modules.employee_compliance.parsers.esic_ecr_parser import parse_esic_ecr
from app.modules.employee_compliance.tests.conftest import ESIC_ECR_RECORDS


def test_extracts_all_esic_records(esic_ecr_path):
    result = parse_esic_ecr(esic_ecr_path)
    assert result.is_reliable is True
    assert len(result.rows) == len(ESIC_ECR_RECORDS)


def test_extracts_ip_number_name_wages_and_contribution(esic_ecr_path):
    result = parse_esic_ecr(esic_ecr_path)
    first = result.rows[0]
    assert first.ip_number == "9000000001"
    assert first.name == "Ravi Kumar"
    assert first.wages == 10000.00
    assert first.ip_contribution == 75.00
    assert first.page == 1


def test_missing_ip_number_simply_absent_from_results(esic_ecr_path):
    result = parse_esic_ecr(esic_ecr_path)
    ip_numbers = {r.ip_number for r in result.rows}
    assert "9000000007" not in ip_numbers


def test_corrupt_file_is_reported_not_crashed(tmp_path):
    path = tmp_path / "corrupt.pdf"
    path.write_bytes(b"not a real pdf")

    result = parse_esic_ecr(str(path))
    assert result.is_reliable is False
