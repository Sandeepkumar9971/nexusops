"""Regression test against the actual real-world sample files the user
provided (Sample_Wagesheet_Aug25.xlsx, PF ECR AUG-25 SAMPLE.pdf, ESIC ECR
AUG-25 SAMPLE.pdf — copied into test-data/compliance-samples-real/).

These are the first genuine EPFO/ESIC ECR exports this module was ever
tested against (the original build had no sample file available at all —
see docs/employee-compliance-verification.md). They exposed three real
bugs, all fixed here:

  1. The PF ECR's real column layout has 8 numeric columns per row (Gross/
     EPF/EPS/EDLI Wages, then EE/EPS/ER, then NCP Days) — the text-fallback
     parser was reading the LAST number (NCP Days) as the EE share instead
     of the 4th-from-last, so every PF amount was wrong.
  2. The PF ECR prints "Name as per ECR" immediately followed by "Name as
     per UAN Repository" with no separator in plain-text extraction —
     producing a doubled name ("ANIL KUMAR ANIL KUMAR") the parser didn't
     deduplicate.
  3. Real ECR exports have no drawn table gridlines at all (confirmed by
     both the PF and ESIC samples), so the text-line fallback is the
     NORMAL path, not a rare degraded one — yet a clean, confident
     text-line match was being blanket-downgraded to NEEDS_REVIEW just for
     using that path, the same as a genuinely-risky OCR read. Fixed to
     only downgrade on `used_ocr`, not merely `not is_reliable`.

This fixture also has five deliberate real discrepancies baked into the
sample data itself (not parsing bugs) — a 100%-matched result was never
the correct expectation. Every one of them is a legitimate compliance
finding: a PF-side name typo, a borderline ESIC-side name variant, one
employee entirely absent from both government filings, one employee
missing from ESIC only, and two amount mismatches (one PF, one ESIC).
"""

import os

import mongomock
from bson import ObjectId

from app.modules.employee_compliance.services import compliance_service
from app.modules.employee_compliance.verification import statuses

SAMPLE_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "..", "..", "..", "test-data", "compliance-samples-real"
)


def _sample_path(filename: str) -> str:
    path = os.path.join(SAMPLE_DIR, filename)
    return os.path.normpath(path)


def _samples_available() -> bool:
    return all(os.path.exists(_sample_path(f)) for f in ("wagesheet.xlsx", "pf_ecr.pdf", "esic_ecr.pdf"))


def test_real_sample_files_produce_the_expected_mix_of_matches_and_findings(tmp_path, monkeypatch):
    if not _samples_available():
        import pytest

        pytest.skip("Real sample files not present in test-data/compliance-samples-real/ — skipping.")

    import shutil

    monkeypatch.setattr(compliance_service.settings, "upload_root", str(tmp_path))
    fake_db = mongomock.MongoClient().db
    monkeypatch.setattr(compliance_service, "get_db", lambda: fake_db)

    job_id = str(ObjectId())
    batch_dir = tmp_path / "employee-compliance" / job_id
    batch_dir.mkdir(parents=True)
    shutil.copy(_sample_path("wagesheet.xlsx"), batch_dir / "wagesheet.xlsx")
    shutil.copy(_sample_path("pf_ecr.pdf"), batch_dir / "pf_ecr.pdf")
    shutil.copy(_sample_path("esic_ecr.pdf"), batch_dir / "esic_ecr.pdf")
    fake_db["jobs"].insert_one({"_id": ObjectId(job_id), "moduleId": "employee-compliance", "status": "PENDING"})

    compliance_service.process_compliance_batch(job_id, "wagesheet.xlsx", "pf_ecr.pdf", "esic_ecr.pdf")

    job = fake_db["jobs"].find_one({"_id": ObjectId(job_id)})
    assert job["totalRecords"] == 12
    assert job["processedRecords"] == 12
    # Exactly one employee (SANJAY PASWAN) is missing from BOTH filings —
    # a genuine compliance gap, correctly counted as "failed" rather than
    # silently treated the same as a clean match.
    assert job["successfulRecords"] == 11
    assert job["failedRecords"] == 1

    results = {r["employee"]["name"]: r for r in fake_db["compliance_employee_results"].find({"jobId": ObjectId(job_id)})}
    assert len(results) == 12

    clean_matches = ["ANIL KUMAR", "SUNITA DEVI", "RAKESH VERMA", "PRIYA SINGH", "MANOJ YADAV", "KAVITA KUMARI"]
    for name in clean_matches:
        assert results[name]["pf"]["status"] == statuses.MATCHED, name
        assert results[name]["esic"]["status"] == statuses.MATCHED, name

    # Real PF-side name discrepancy: wagesheet "DINESH PRASAD" vs the PF
    # ECR's own submitted "DEVENDRA PRASAD" — same amount, different name.
    assert results["DINESH PRASAD"]["pf"]["status"] == statuses.NAME_MISMATCH
    assert results["DINESH PRASAD"]["pf"]["ecrAmount"] == 1529.0
    assert results["DINESH PRASAD"]["esic"]["status"] == statuses.MATCHED

    # Real ESIC-side borderline name variant: "REKHA SHARMA" vs "RENU SHARMA".
    assert results["REKHA SHARMA"]["pf"]["status"] == statuses.MATCHED
    assert results["REKHA SHARMA"]["esic"]["status"] == statuses.NEEDS_REVIEW

    # Entirely absent from both government filings.
    assert results["SANJAY PASWAN"]["pf"]["status"] == statuses.MISSING
    assert results["SANJAY PASWAN"]["esic"]["status"] == statuses.MISSING

    # Present in PF but missing from ESIC specifically.
    assert results["POOJA GUPTA"]["pf"]["status"] == statuses.MATCHED
    assert results["POOJA GUPTA"]["esic"]["status"] == statuses.MISSING

    # Real PF amount mismatch: wagesheet 1654 vs ECR 1354.
    assert results["VIKRAM THAKUR"]["pf"]["status"] == statuses.AMOUNT_MISMATCH
    assert results["VIKRAM THAKUR"]["pf"]["difference"] == 300.0
    assert results["VIKRAM THAKUR"]["esic"]["status"] == statuses.MATCHED

    # Real ESIC amount mismatch: wagesheet 86 vs ECR 66.
    assert results["NEHA MISHRA"]["pf"]["status"] == statuses.MATCHED
    assert results["NEHA MISHRA"]["esic"]["status"] == statuses.AMOUNT_MISMATCH
    assert results["NEHA MISHRA"]["esic"]["difference"] == 20.0

    # None of the above should have been forced into NEEDS_REVIEW just for
    # using the text-line fallback (no table gridlines in a real ECR) —
    # only a genuinely OCR'd page should ever trigger that.
    for r in results.values():
        assert "best-effort fallback" not in (r["pf"].get("reason") or "")
        assert "best-effort fallback" not in (r["esic"].get("reason") or "")
