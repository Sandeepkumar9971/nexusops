from app.modules.employee_compliance.parsers.pf_ecr_parser import parse_pf_ecr
from app.modules.employee_compliance.tests.conftest import PF_ECR_RECORDS


def test_extracts_all_pf_records(pf_ecr_path):
    result = parse_pf_ecr(pf_ecr_path)
    assert result.is_reliable is True
    assert len(result.rows) == len(PF_ECR_RECORDS)


def test_extracts_uan_name_and_ee_share_correctly(pf_ecr_path):
    result = parse_pf_ecr(pf_ecr_path)
    first = result.rows[0]
    assert first.uan == "100000000001"
    assert first.name == "Ravi Kumar"
    assert first.ee_share == 1200.00
    assert first.page == 1


def test_duplicate_uan_is_present_as_two_records(pf_ecr_path):
    """The parser's job is to extract faithfully — deciding that a
    duplicate is ambiguous is the verification engine's responsibility,
    tested separately."""
    result = parse_pf_ecr(pf_ecr_path)
    matches = [r for r in result.rows if r.uan == "100000000009"]
    assert len(matches) == 2


def test_empty_pdf_is_reported_not_crashed(tmp_path):
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet

    path = tmp_path / "empty_pf.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=A4)
    doc.build([Paragraph("No data here.", getSampleStyleSheet()["Normal"])])

    result = parse_pf_ecr(str(path))
    assert result.is_reliable is False
    assert result.rows == []


def test_corrupt_file_is_reported_not_crashed(tmp_path):
    path = tmp_path / "corrupt.pdf"
    path.write_bytes(b"not a real pdf")

    result = parse_pf_ecr(str(path))
    assert result.is_reliable is False
    assert len(result.document_errors) >= 1
