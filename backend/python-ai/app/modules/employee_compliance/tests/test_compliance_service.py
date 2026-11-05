"""End-to-end test of the full pipeline (parse -> match -> verify ->
persist -> generate report) against an in-memory MongoDB (mongomock) and
the synthetic wagesheet/PF ECR/ESIC ECR fixtures — no real database or
network access required to run this."""

import os
import shutil

import mongomock
from bson import ObjectId

from app.modules.employee_compliance.services import compliance_service
from app.modules.employee_compliance.tests.conftest import (
    _build_esic_ecr_pdf,
    _build_pf_ecr_pdf,
    _build_wagesheet_workbook,
)
from app.modules.employee_compliance.verification import statuses


def _setup_batch_files(tmp_path, job_id):
    batch_dir = tmp_path / "employee-compliance" / job_id
    batch_dir.mkdir(parents=True)
    _build_wagesheet_workbook(batch_dir / "wagesheet.xlsx")
    _build_pf_ecr_pdf(batch_dir / "pf_ecr.pdf")
    _build_esic_ecr_pdf(batch_dir / "esic_ecr.pdf")


def test_full_pipeline_produces_expected_statuses(tmp_path, monkeypatch):
    monkeypatch.setattr(compliance_service.settings, "upload_root", str(tmp_path))
    fake_db = mongomock.MongoClient().db
    monkeypatch.setattr(compliance_service, "get_db", lambda: fake_db)

    job_id = str(ObjectId())
    fake_db["jobs"].insert_one({"_id": ObjectId(job_id), "moduleId": "employee-compliance", "status": "PENDING"})
    _setup_batch_files(tmp_path, job_id)

    compliance_service.process_compliance_batch(job_id, "wagesheet.xlsx", "pf_ecr.pdf", "esic_ecr.pdf")

    job = fake_db["jobs"].find_one({"_id": ObjectId(job_id)})
    assert job["status"] in ("COMPLETED", "PARTIALLY_COMPLETED")
    assert job["totalRecords"] == 10
    assert job["processedRecords"] == 10
    assert job["progressPercentage"] == 100
    assert job["completedAt"] is not None

    results = {r["employee"]["uan"]: r for r in fake_db["compliance_employee_results"].find({"jobId": ObjectId(job_id)})}
    assert len(results) == 10

    # Fully matched
    assert results["100000000001"]["pf"]["status"] == statuses.MATCHED
    assert results["100000000001"]["esic"]["status"] == statuses.MATCHED

    # PF amount mismatch
    assert results["100000000002"]["pf"]["status"] == statuses.AMOUNT_MISMATCH
    assert results["100000000002"]["esic"]["status"] == statuses.MATCHED

    # ESIC amount mismatch
    assert results["100000000003"]["pf"]["status"] == statuses.MATCHED
    assert results["100000000003"]["esic"]["status"] == statuses.AMOUNT_MISMATCH

    # PF name mismatch
    assert results["100000000004"]["pf"]["status"] == statuses.NAME_MISMATCH

    # ESIC name mismatch
    assert results["100000000005"]["esic"]["status"] == statuses.NAME_MISMATCH

    # Missing PF record
    assert results["100000000006"]["pf"]["status"] == statuses.MISSING

    # Missing ESIC record
    assert results["100000000007"]["esic"]["status"] == statuses.MISSING

    # Minor spelling variation -> needs review, not blindly matched
    assert results["100000000008"]["pf"]["status"] == statuses.NEEDS_REVIEW

    # Duplicate identifier -> needs review, never silently picks one
    assert results["100000000009"]["pf"]["status"] == statuses.NEEDS_REVIEW

    # Manual-review (truncated name)
    assert results["100000000010"]["esic"]["status"] == statuses.NEEDS_REVIEW

    # Report was generated and registered
    report = fake_db["reports"].find_one({"jobId": ObjectId(job_id), "type": "xlsx"})
    assert report is not None
    assert os.path.exists(report["filePath"])


def test_unreadable_wagesheet_fails_cleanly_not_stuck(tmp_path, monkeypatch):
    monkeypatch.setattr(compliance_service.settings, "upload_root", str(tmp_path))
    fake_db = mongomock.MongoClient().db
    monkeypatch.setattr(compliance_service, "get_db", lambda: fake_db)

    job_id = str(ObjectId())
    fake_db["jobs"].insert_one({"_id": ObjectId(job_id), "moduleId": "employee-compliance", "status": "PENDING"})
    batch_dir = tmp_path / "employee-compliance" / job_id
    batch_dir.mkdir(parents=True)
    (batch_dir / "wagesheet.xlsx").write_bytes(b"not a real excel file")
    _build_pf_ecr_pdf(batch_dir / "pf_ecr.pdf")
    _build_esic_ecr_pdf(batch_dir / "esic_ecr.pdf")

    compliance_service.process_compliance_batch(job_id, "wagesheet.xlsx", "pf_ecr.pdf", "esic_ecr.pdf")

    job = fake_db["jobs"].find_one({"_id": ObjectId(job_id)})
    assert job["status"] == "FAILED"
    assert job["completedAt"] is not None
    assert job["error"]["message"]


def test_unreadable_pf_ecr_flags_all_employees_for_review_not_missing(tmp_path, monkeypatch):
    """An ECR that can't be read at all is a document-level problem — every
    employee should come back NEEDS_REVIEW, not MISSING (which would
    wrongly imply the document was read fine and they're just absent)."""
    monkeypatch.setattr(compliance_service.settings, "upload_root", str(tmp_path))
    fake_db = mongomock.MongoClient().db
    monkeypatch.setattr(compliance_service, "get_db", lambda: fake_db)

    job_id = str(ObjectId())
    fake_db["jobs"].insert_one({"_id": ObjectId(job_id), "moduleId": "employee-compliance", "status": "PENDING"})
    batch_dir = tmp_path / "employee-compliance" / job_id
    batch_dir.mkdir(parents=True)
    _build_wagesheet_workbook(batch_dir / "wagesheet.xlsx")
    (batch_dir / "pf_ecr.pdf").write_bytes(b"not a real pdf")
    _build_esic_ecr_pdf(batch_dir / "esic_ecr.pdf")

    compliance_service.process_compliance_batch(job_id, "wagesheet.xlsx", "pf_ecr.pdf", "esic_ecr.pdf")

    results = list(fake_db["compliance_employee_results"].find({"jobId": ObjectId(job_id)}))
    assert len(results) == 10
    assert all(r["pf"]["status"] == statuses.NEEDS_REVIEW for r in results)
