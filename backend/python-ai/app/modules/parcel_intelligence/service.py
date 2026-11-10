import logging
import os
from datetime import datetime, timezone

from bson import ObjectId

from app.core.config import settings
from app.core.db import get_db
from app.core.notification_client import notify
from app.modules.parcel_intelligence.pipeline import run_detection_pipeline

UPLOAD_SUBFOLDER = "parcel-intelligence"

logger = logging.getLogger(__name__)


def process_parcel_job(job_id: str, filenames: list[str]):
    """Runs synchronously inside a FastAPI BackgroundTask — no Celery/Redis
    yet (that arrives in Phase 9 for real distributed workers). This is
    enough to prove the detection pipeline and the Job progress contract
    both work end to end.

    Every image is processed inside its own try/except, and the final
    status update runs in a finally block — one image's unexpected crash
    (a missing Tesseract binary, a corrupt file, anything) must never leave
    the whole job stuck in PROCESSING forever.
    """
    db = get_db()
    jobs = db["jobs"]
    results = db["parcel_results"]
    job_object_id = ObjectId(job_id)

    jobs.update_one({"_id": job_object_id}, {"$set": {"status": "PROCESSING"}})

    total = len(filenames)
    successful = 0
    failed = 0
    needs_review = 0

    try:
        for index, filename in enumerate(filenames, start=1):
            image_path = os.path.join(settings.upload_root, UPLOAD_SUBFOLDER, job_id, filename)

            try:
                outcome = run_detection_pipeline(image_path)
            except Exception as exc:  # noqa: BLE001 - must never kill the whole job
                logger.exception("Unexpected error processing %s (job %s)", filename, job_id)
                outcome = {
                    "filename": filename,
                    "status": "FAILED",
                    "errorReason": f"Unexpected processing error: {exc}",
                }

            if outcome["status"] == "FAILED":
                failed += 1
            else:
                successful += 1
            if outcome["status"] == "NEEDS_REVIEW":
                needs_review += 1

            results.insert_one(
                {
                    "jobId": job_object_id,
                    "moduleId": "parcel-intelligence",
                    "filename": outcome["filename"],
                    "status": outcome["status"],
                    "ocrConfidence": outcome.get("ocrConfidence"),
                    "rawOcrText": outcome.get("rawOcrText"),
                    "extractionMethod": outcome.get("extractionMethod"),
                    "fields": outcome.get("fields"),
                    "errorReason": outcome.get("errorReason"),
                    "createdAt": datetime.now(timezone.utc),
                }
            )

            progress = round((index / total) * 100) if total else 100
            jobs.update_one(
                {"_id": job_object_id},
                {
                    "$set": {
                        "processedRecords": index,
                        "successfulRecords": successful,
                        "failedRecords": failed,
                        "progressPercentage": progress,
                    }
                },
            )
    finally:
        if failed == 0 and successful > 0:
            final_status = "COMPLETED"
        elif successful > 0:
            final_status = "PARTIALLY_COMPLETED"
        else:
            final_status = "FAILED"

        jobs.update_one(
            {"_id": job_object_id},
            {"$set": {"status": final_status, "completedAt": datetime.now(timezone.utc)}},
        )

        if final_status == "FAILED":
            notify(
                job_id=job_id,
                module_id="parcel-intelligence",
                type_="PROCESSING_FAILED",
                severity="CRITICAL",
                title="Parcel batch failed",
                message=f"All {total} image(s) in this batch failed extraction.",
                dedupe_key=f"parcel-job-done:{job_id}",
            )
        elif needs_review > 0:
            notify(
                job_id=job_id,
                module_id="parcel-intelligence",
                type_="PARCEL_EXTRACTION_EXCEPTION",
                severity="WARNING",
                title="Parcel batch needs review",
                message=f"{needs_review} of {total} image(s) need manual review — AWB/weight could not be confidently extracted.",
                dedupe_key=f"parcel-job-done:{job_id}",
            )
        else:
            notify(
                job_id=job_id,
                module_id="parcel-intelligence",
                type_="PROCESSING_COMPLETED",
                severity="SUCCESS",
                title="Parcel batch completed",
                message=f"All {total} image(s) extracted successfully.",
                dedupe_key=f"parcel-job-done:{job_id}",
            )
