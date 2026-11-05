from app.modules.employee_compliance.schemas.models import EsicEcrRecord, PfEcrRecord, WagesheetRow
from app.modules.employee_compliance.verification import statuses
from app.modules.employee_compliance.verification.esic_verification import verify_esic
from app.modules.employee_compliance.verification.pf_verification import verify_pf


def _row(**overrides):
    defaults = dict(row_number=1, name="Ravi Kumar", uan="100000000001", ip_number="9000000001", pf_amount=1200.0, esic_amount=75.0, errors=[])
    defaults.update(overrides)
    return WagesheetRow(**defaults)


def test_pf_matched_when_name_and_amount_both_match():
    row = _row()
    index = {"100000000001": [PfEcrRecord(uan="100000000001", name="Ravi Kumar", ee_share=1200.0, page=1)]}
    result = verify_pf(row, index)
    assert result["status"] == statuses.MATCHED


def test_pf_amount_mismatch_when_difference_exceeds_tolerance():
    row = _row(pf_amount=1500.0)
    index = {"100000000001": [PfEcrRecord(uan="100000000001", name="Ravi Kumar", ee_share=1200.0, page=1)]}
    result = verify_pf(row, index)
    assert result["status"] == statuses.AMOUNT_MISMATCH
    assert result["difference"] == 300.0


def test_pf_small_rounding_difference_within_tolerance_still_matches():
    row = _row(pf_amount=1200.5)
    index = {"100000000001": [PfEcrRecord(uan="100000000001", name="Ravi Kumar", ee_share=1200.0, page=1)]}
    result = verify_pf(row, index)
    assert result["status"] == statuses.MATCHED


def test_pf_name_mismatch_takes_priority_over_amount_comparison():
    """Per the spec's own status definitions, AMOUNT_MISMATCH requires the
    name to already match — a wrong name must never be masked by a
    coincidentally-correct amount."""
    row = _row(pf_amount=1200.0)
    index = {"100000000001": [PfEcrRecord(uan="100000000001", name="Ramesh Gupta", ee_share=1200.0, page=1)]}
    result = verify_pf(row, index)
    assert result["status"] == statuses.NAME_MISMATCH


def test_pf_missing_when_uan_not_in_ecr():
    row = _row()
    result = verify_pf(row, {})
    assert result["status"] == statuses.MISSING


def test_pf_needs_review_on_duplicate_uan_in_ecr():
    row = _row()
    index = {
        "100000000001": [
            PfEcrRecord(uan="100000000001", name="Ravi Kumar", ee_share=1200.0, page=1),
            PfEcrRecord(uan="100000000001", name="Ravi Kumar", ee_share=1250.0, page=2),
        ]
    }
    result = verify_pf(row, index)
    assert result["status"] == statuses.NEEDS_REVIEW
    assert "ambiguous" in result["reason"].lower()


def test_pf_needs_review_on_borderline_name_similarity():
    row = _row(name="Mohd Irfan Khan")
    index = {"100000000001": [PfEcrRecord(uan="100000000001", name="Mohammed Irfan Khan", ee_share=1200.0, page=1)]}
    result = verify_pf(row, index)
    assert result["status"] == statuses.NEEDS_REVIEW


def test_pf_needs_review_when_wagesheet_row_has_errors():
    row = _row(uan=None, errors=["missing UAN"])
    result = verify_pf(row, {})
    assert result["status"] == statuses.NEEDS_REVIEW


def test_pf_original_amounts_are_preserved_not_altered():
    row = _row(pf_amount=1500.0)
    index = {"100000000001": [PfEcrRecord(uan="100000000001", name="Ravi Kumar", ee_share=1200.0, page=1)]}
    result = verify_pf(row, index)
    assert result["wagesheetAmount"] == 1500.0
    assert result["ecrAmount"] == 1200.0


# --- ESIC mirrors the same logic with IP Number as the identifier ---


def test_esic_matched_when_name_and_amount_both_match():
    row = _row()
    index = {"9000000001": [EsicEcrRecord(ip_number="9000000001", name="Ravi Kumar", wages=10000.0, ip_contribution=75.0, page=1)]}
    result = verify_esic(row, index)
    assert result["status"] == statuses.MATCHED


def test_esic_amount_mismatch():
    row = _row(esic_amount=100.0)
    index = {"9000000001": [EsicEcrRecord(ip_number="9000000001", name="Ravi Kumar", wages=10000.0, ip_contribution=75.0, page=1)]}
    result = verify_esic(row, index)
    assert result["status"] == statuses.AMOUNT_MISMATCH


def test_esic_name_mismatch():
    # Note: "Ravi Kumar" vs "Vijay Kumar" would NOT work here — they share
    # the token "Kumar", which inflates token_sort_ratio to ~76 (REVIEW,
    # not MISMATCH). This shared-surname case is a documented limitation
    # (see README) — "Deepak Singh" vs "Vijay Kumar" (no shared tokens,
    # verified at 26.1) is used instead for an unambiguous mismatch.
    row = _row(name="Deepak Singh")
    index = {"9000000001": [EsicEcrRecord(ip_number="9000000001", name="Vijay Kumar", wages=10000.0, ip_contribution=75.0, page=1)]}
    result = verify_esic(row, index)
    assert result["status"] == statuses.NAME_MISMATCH


def test_esic_missing_when_ip_number_not_in_ecr():
    row = _row()
    result = verify_esic(row, {})
    assert result["status"] == statuses.MISSING


def test_esic_needs_review_on_duplicate_ip_number():
    row = _row()
    index = {
        "9000000001": [
            EsicEcrRecord(ip_number="9000000001", name="Ravi Kumar", wages=10000.0, ip_contribution=75.0, page=1),
            EsicEcrRecord(ip_number="9000000001", name="Ravi Kumar", wages=10000.0, ip_contribution=80.0, page=2),
        ]
    }
    result = verify_esic(row, index)
    assert result["status"] == statuses.NEEDS_REVIEW
