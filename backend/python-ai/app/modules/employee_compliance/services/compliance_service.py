import logging
import os
from datetime import datetime, timezone

from bson import ObjectId

from app.core.config import settings
from app.core.db import get_db
from app.modules.employee_compliance.parsers.esic_ecr_parser import parse_esic_ecr
from app.modules.employee_compliance.parsers.pf_ecr_parser import parse_pf_ecr
from app.modules.employee_compliance.parsers.wagesheet_parser import parse_wagesheet
from app.modules.employee_compliance.reports.excel_report import generate_excel_report
from app.modules.employee_compliance.verification import statuses
from app.modules.employee_compliance.verification.esic_verification import verify_esic
from app.modules.employee_compliance.verification.pf_verification import verify_pf

logger = logging.getLogger(__name__)

UPLOAD_SUBFOLDER = "employee-compliance"
MODULE_ID = "employee-compliance"


def _set_stage(jobs, job_object_id, stage: str):
    jobs.update_one({"_id": job_object_id}, {"$set": {"currentStage": stage}})


def _index_by(records, key_attr: str) -> dict:
    index: dict = {}
    for record in records:
        index.setdefault(getattr(record, key_attr), []).append(record)
    return index


def _unreadable_verification(wagesheet_amount, document_errors: list[str], side: str) -> dict:
    return {
        "wagesheetAmount": wagesheet_amount,
        "ecrAmount": None,
        "difference": None,
        "ecrName": None,
        "nameSimilarity": None,
        "status": statuses.NEEDS_REVIEW,
        "reason": f"{side} ECR document could not be read reliably: " + "; ".join(document_errors),
        "sourcePage": None,
    }


def process_compliance_batch(job_id: str, wagesheet_filename: str, pf_ecr_filename: str, esic_ecr_filename: str):
    """Runs as a FastAPI BackgroundTask, same in-process approach as
    parcel_intelligence (no Celery/Redis dependency). Every employee row
    is isolated inside its own try/except and the final status update runs
    in a finally block — one bad row, or even a totally unreadable ECR,
    must never leave the batch stuck in PROCESSING forever."""
    db = get_db()
    jobs = db["jobs"]
    results_collection = db["compliance_employee_results"]
    reports_collection = db["reports"]
    job_object_id = ObjectId(job_id)

    batch_dir = os.path.join(settings.upload_root, UPLOAD_SUBFOLDER, job_id)
    wagesheet_path = os.path.join(batch_dir, wagesheet_filename)
    pf_ecr_path = os.path.join(batch_dir, pf_ecr_filename)
    esic_ecr_path = os.path.join(batch_dir, esic_ecr_filename)

    jobs.update_one({"_id": job_object_id}, {"$set": {"status": "PROCESSING"}})

    successful = 0
    failed = 0
    employee_docs: list[dict] = []

    try:
        _set_stage(jobs, job_object_id, "Validating files")

        _set_stage(jobs, job_object_id, "Extracting wagesheet")
        wagesheet_result = parse_wagesheet(wagesheet_path)

        if not wagesheet_result.rows:
            jobs.update_one(
                {"_id": job_object_id},
                {
                    "$set": {
                        "error": {
                            "message": "; ".join(wagesheet_result.document_errors) or "Wagesheet could not be parsed."
                        }
                    }
                },
            )
            return  # still hits `finally` below, which marks the job FAILED

        _set_stage(jobs, job_object_id, "Extracting PF ECR")
        pf_result = parse_pf_ecr(pf_ecr_path)

        _set_stage(jobs, job_object_id, "Extracting ESIC ECR")
        esic_result = parse_esic_ecr(esic_ecr_path)

        total = len(wagesheet_result.rows)
        jobs.update_one({"_id": job_object_id}, {"$set": {"totalRecords": total}})

        _set_stage(jobs, job_object_id, "Matching identifiers")
        pf_by_uan = _index_by(pf_result.rows, "uan")
        esic_by_ip = _index_by(esic_result.rows, "ip_number")

        # An ECR that produced zero rows is unreadable for every employee —
        # report that plainly instead of letting every row independently
        # discover "MISSING" (which would wrongly imply the ECR was read
        # fine and the employee is just absent from it).
        pf_unreadable = not pf_result.rows
        esic_unreadable = not esic_result.rows

        _set_stage(jobs, job_object_id, "Comparing names and contributions")

        for index, row in enumerate(wagesheet_result.rows, start=1):
            try:
                if row.errors:
                    pf_verification = _unreadable_verification(row.pf_amount, row.errors, "Wagesheet row has errors —")
                    esic_verification = _unreadable_verification(row.esic_amount, row.errors, "Wagesheet row has errors —")
                else:
                    if pf_unreadable:
                        pf_verification = _unreadable_verification(row.pf_amount, pf_result.document_errors, "PF")
                    else:
                        pf_verification = verify_pf(row, pf_by_uan)
                        if pf_result.used_ocr and pf_verification["status"] == statuses.MATCHED:
                            # OCR (a genuinely scanned page) is the actually
                            # unreliable path — a confident MATCHED off an
                            # OCR read is the false-positive risk the spec
                            # warns about. A real EPFO ECR's ordinary text
                            # fallback (no drawn table gridlines, but
                            # perfectly extractable text) is NOT penalized
                            # here — confirmed against an actual sample to
                            # parse cleanly, so downgrading every MATCHED
                            # row just because no table was found would
                            # defeat automation for the normal case.
                            pf_verification["status"] = statuses.NEEDS_REVIEW
                            pf_verification["reason"] += " (PF ECR page was OCR'd from a scanned image — please verify.)"

                    if esic_unreadable:
                        esic_verification = _unreadable_verification(row.esic_amount, esic_result.document_errors, "ESIC")
                    else:
                        esic_verification = verify_esic(row, esic_by_ip)
                        if esic_result.used_ocr and esic_verification["status"] == statuses.MATCHED:
                            esic_verification["status"] = statuses.NEEDS_REVIEW
                            esic_verification["reason"] += " (ESIC ECR page was OCR'd from a scanned image — please verify.)"
            except Exception as exc:  # noqa: BLE001 - one row must never kill the batch
                logger.exception("Unexpected error verifying row %s (job %s)", row.row_number, job_id)
                pf_verification = _unreadable_verification(row.pf_amount, [str(exc)], "Unexpected error —")
                esic_verification = _unreadable_verification(row.esic_amount, [str(exc)], "Unexpected error —")

            if pf_verification["status"] == statuses.MISSING and esic_verification["status"] == statuses.MISSING:
                failed += 1
            else:
                successful += 1

            employee_doc = {
                "jobId": job_object_id,
                "moduleId": MODULE_ID,
                "employee": {
                    "name": row.name,
                    "uan": row.uan,
                    "ipNumber": row.ip_number,
                    "agency": row.agency,
                    "state": row.state,
                },
                "wagesheet": {"pfAmount": row.pf_amount, "esicAmount": row.esic_amount},
                "pf": pf_verification,
                "esic": esic_verification,
                "rowErrors": row.errors,
                "createdAt": datetime.now(timezone.utc),
            }
            results_collection.insert_one(dict(employee_doc))
            employee_docs.append(employee_doc)

            # Report generation gets the last slice of the progress bar so
            # it doesn't look stuck at 100% while the workbook is written.
            progress = round((index / total) * 90) if total else 90
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

        _set_stage(jobs, job_object_id, "Generating report")
        report_dir = os.path.join(settings.upload_root, "reports", MODULE_ID)
        os.makedirs(report_dir, exist_ok=True)
        report_path = os.path.join(report_dir, f"{job_id}.xlsx")
        generate_excel_report(job_id, employee_docs, report_path)

        reports_collection.update_one(
            {"jobId": job_object_id, "moduleId": MODULE_ID, "type": "xlsx"},
            {"$set": {"filePath": report_path, "createdAt": datetime.now(timezone.utc)}},
            upsert=True,
        )
        jobs.update_one({"_id": job_object_id}, {"$set": {"progressPercentage": 100}})

    except Exception as exc:  # noqa: BLE001 - must never leave the job stuck in PROCESSING
        logger.exception("Unexpected error processing compliance batch %s", job_id)
        jobs.update_one({"_id": job_object_id}, {"$set": {"error": {"message": f"Unexpected processing error: {exc}"}}})

    finally:
        if failed == 0 and successful > 0:
            final_status = "COMPLETED"
        elif successful > 0:
            final_status = "PARTIALLY_COMPLETED"
        else:
            final_status = "FAILED"

        jobs.update_one(
            {"_id": job_object_id},
            {"$set": {"status": final_status, "currentStage": "Done", "completedAt": datetime.now(timezone.utc)}},
        )
