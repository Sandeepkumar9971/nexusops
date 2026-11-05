"""End-to-end test of the full pipeline (parse -> calculate -> detect
anomalies -> generate insights -> persist -> alert -> generate reports)
against an in-memory MongoDB (mongomock) and the four-scenario synthetic
fixture — no real database or network access required to run this."""

import os

import mongomock
from bson import ObjectId

from app.modules.fc_financial_monitor.services import financial_service
from app.modules.fc_financial_monitor.tests.conftest import _build_financial_workbook


def _setup_batch_file(tmp_path, job_id, filename="daily_financials.xlsx"):
    batch_dir = tmp_path / "fc-financial-monitor" / job_id
    batch_dir.mkdir(parents=True)
    _build_financial_workbook(batch_dir / filename)


def _seed_targets(fake_db):
    fake_db["financial_targets"].insert_many(
        [
            {"metric": "manpower_cost", "minimum": 18, "maximum": 24, "source": "default-estimate"},
            {"metric": "packaging_cost", "minimum": 8, "maximum": 12, "source": "default-estimate"},
            {"metric": "power_and_fuel", "minimum": 4, "maximum": 6, "source": "default-estimate"},
            {"metric": "fc_rent", "minimum": 18, "maximum": 22, "source": "default-estimate"},
            {"metric": "equipment_rentals", "minimum": 4, "maximum": 6, "source": "default-estimate"},
            {"metric": "overheads", "minimum": 13, "maximum": 17, "source": "default-estimate"},
        ]
    )


def test_full_pipeline_covers_all_four_required_scenarios(tmp_path, monkeypatch):
    monkeypatch.setattr(financial_service.settings, "upload_root", str(tmp_path))
    fake_db = mongomock.MongoClient().db
    monkeypatch.setattr(financial_service, "get_db", lambda: fake_db)
    _seed_targets(fake_db)

    job_id = str(ObjectId())
    fake_db["jobs"].insert_one({"_id": ObjectId(job_id), "moduleId": "fc-financial-monitor", "status": "PENDING"})
    _setup_batch_file(tmp_path, job_id)

    financial_service.process_financial_batch(job_id, "daily_financials.xlsx")

    job = fake_db["jobs"].find_one({"_id": ObjectId(job_id)})
    assert job["status"] == "COMPLETED"
    assert job["totalRecords"] == 4
    assert job["processedRecords"] == 4
    assert job["progressPercentage"] == 100
    assert job["completedAt"] is not None
    assert job["summary"]["totalFCs"] == 4

    records = {r["fcName"]: r for r in fake_db["fc_daily_financials"].find({"jobId": ObjectId(job_id)})}
    assert len(records) == 4

    # Scenario 1: one clean day
    assert records["Alpha"]["overallStatus"] == "GREEN"
    assert records["Alpha"]["cm1Percentage"] == 68.0
    assert records["Alpha"]["cm2Percentage"] == 22.0
    assert records["Alpha"]["flaggedCosts"] == []

    # Scenario 2: CM2 breach
    assert records["Beta"]["overallStatus"] == "RED"
    assert records["Beta"]["cm2Percentage"] == 5.0
    assert "Manpower Cost" in records["Beta"]["flaggedCosts"]
    assert "Power & Fuel" in records["Beta"]["flaggedCosts"]

    # Scenario 3: line-item-only breach — CM1/CM2 both fine, one cost flagged
    assert records["Gamma"]["overallStatus"] == "GREEN"
    assert records["Gamma"]["flaggedCosts"] == ["Equipment Rentals"]

    # Scenario 4: suspiciously high CM2
    assert records["Delta"]["overallStatus"] == "BLUE"
    assert records["Delta"]["cm2Percentage"] == 35.0

    anomalies = list(fake_db["financial_anomalies"].find({"jobId": ObjectId(job_id)}))
    beta_anomaly_metrics = {a["metric"] for a in anomalies if a["fcName"] == "Beta"}
    assert "CM1" in beta_anomaly_metrics
    assert "CM2" in beta_anomaly_metrics
    assert "Manpower Cost" in beta_anomaly_metrics
    assert "Power & Fuel" in beta_anomaly_metrics
    assert all(a["status"] == "OPEN" for a in anomalies)

    delta_anomaly = next(a for a in anomalies if a["fcName"] == "Delta" and a["metric"] == "CM2")
    assert "underreported" in delta_anomaly["explanation"].lower()

    # Alerts: non-GREEN FCs get alerted, GREEN/clean FCs never do.
    alerts = list(fake_db["financial_alerts"].find({}))
    alerted_fcs = {a["fcName"] for a in alerts}
    assert alerted_fcs == {"Beta", "Delta"}
    # 4 channels each for Beta and Delta.
    assert len(alerts) == 8

    report = fake_db["reports"].find_one({"jobId": ObjectId(job_id), "type": "xlsx"})
    assert report is not None
    assert os.path.exists(report["filePath"])
    csv_report = fake_db["reports"].find_one({"jobId": ObjectId(job_id), "type": "csv"})
    assert csv_report is not None
    assert os.path.exists(csv_report["filePath"])


def test_unreadable_file_fails_cleanly_not_stuck(tmp_path, monkeypatch):
    monkeypatch.setattr(financial_service.settings, "upload_root", str(tmp_path))
    fake_db = mongomock.MongoClient().db
    monkeypatch.setattr(financial_service, "get_db", lambda: fake_db)

    job_id = str(ObjectId())
    fake_db["jobs"].insert_one({"_id": ObjectId(job_id), "moduleId": "fc-financial-monitor", "status": "PENDING"})
    batch_dir = tmp_path / "fc-financial-monitor" / job_id
    batch_dir.mkdir(parents=True)
    (batch_dir / "bad.xlsx").write_bytes(b"not a real excel file")

    financial_service.process_financial_batch(job_id, "bad.xlsx")

    job = fake_db["jobs"].find_one({"_id": ObjectId(job_id)})
    assert job["status"] == "FAILED"
    assert job["completedAt"] is not None
    assert job["error"]["message"]


def test_partial_batch_with_one_invalid_row_does_not_fail_the_whole_batch(tmp_path, monkeypatch):
    """Zero revenue makes CM1%/CM2% uncomputable for that one row, but every
    other row in the same file must still be processed normally."""
    monkeypatch.setattr(financial_service.settings, "upload_root", str(tmp_path))
    fake_db = mongomock.MongoClient().db
    monkeypatch.setattr(financial_service, "get_db", lambda: fake_db)
    _seed_targets(fake_db)

    job_id = str(ObjectId())
    fake_db["jobs"].insert_one({"_id": ObjectId(job_id), "moduleId": "fc-financial-monitor", "status": "PENDING"})
    batch_dir = tmp_path / "fc-financial-monitor" / job_id
    batch_dir.mkdir(parents=True)

    rows = [("Alpha", "2026-01-01", 100000, 22000, 10000, 5000, 20000, 5000, 16000), ("Zulu", "2026-01-01", 0, 2000, 1000, 500, 2000, 500, 1500)]
    _build_financial_workbook(batch_dir / "daily_financials.xlsx", rows=rows)

    financial_service.process_financial_batch(job_id, "daily_financials.xlsx")

    job = fake_db["jobs"].find_one({"_id": ObjectId(job_id)})
    assert job["status"] == "PARTIALLY_COMPLETED"
    assert job["successfulRecords"] == 1
    assert job["failedRecords"] == 1

    records = {r["fcName"]: r for r in fake_db["fc_daily_financials"].find({"jobId": ObjectId(job_id)})}
    assert records["Alpha"]["overallStatus"] == "GREEN"
    assert records["Zulu"]["overallStatus"] == "UNKNOWN"
    assert records["Zulu"]["cm1Percentage"] is None


def test_missing_targets_are_reported_not_invented(tmp_path, monkeypatch):
    """Without running the seed script, cost-category targets are
    unconfigured — the batch must still process cleanly and say so, never
    silently evaluate against a guessed range."""
    monkeypatch.setattr(financial_service.settings, "upload_root", str(tmp_path))
    fake_db = mongomock.MongoClient().db
    monkeypatch.setattr(financial_service, "get_db", lambda: fake_db)
    # Deliberately NOT seeding financial_targets.

    job_id = str(ObjectId())
    fake_db["jobs"].insert_one({"_id": ObjectId(job_id), "moduleId": "fc-financial-monitor", "status": "PENDING"})
    _setup_batch_file(tmp_path, job_id)

    financial_service.process_financial_batch(job_id, "daily_financials.xlsx")

    job = fake_db["jobs"].find_one({"_id": ObjectId(job_id)})
    assert job["status"] == "COMPLETED"

    anomalies = list(fake_db["financial_anomalies"].find({"fcName": "Gamma"}))
    # Gamma's only real finding was the equipment-rentals breach; with no
    # configured target it becomes an INFO "cannot evaluate" anomaly instead.
    info_anomalies = [a for a in anomalies if a["severity"] == "INFO"]
    assert len(info_anomalies) > 0
    assert all("no target range is configured" in a["explanation"].lower() for a in info_anomalies)
