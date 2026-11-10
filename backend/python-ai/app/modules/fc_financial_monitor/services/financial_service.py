from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from bson import ObjectId

from app.core.config import settings
from app.core.db import get_db
from app.core.notification_client import notify
from app.modules.fc_financial_monitor.alerts.alert_dispatcher import dispatch_fc_alert
from app.modules.fc_financial_monitor.anomaly_detection.engine import (
    classify_cm2_status,
    data_quality_anomaly,
    detect_cm_anomaly,
    detect_cost_anomaly,
)
from app.modules.fc_financial_monitor.anomaly_detection.trend_analysis import compute_recurring_streak
from app.modules.fc_financial_monitor.calculations.margin_calculations import calculate_metrics
from app.modules.fc_financial_monitor.insights.insight_generator import generate_insight
from app.modules.fc_financial_monitor.parsers.financial_parser import parse_financial_file
from app.modules.fc_financial_monitor.reports.csv_report import generate_csv_report
from app.modules.fc_financial_monitor.reports.excel_report import generate_excel_report
from app.modules.fc_financial_monitor.schemas.models import COST_CATEGORIES
from app.modules.fc_financial_monitor.targets.target_resolver import get_targets

logger = logging.getLogger(__name__)

UPLOAD_SUBFOLDER = "fc-financial-monitor"
MODULE_ID = "fc-financial-monitor"

GREEN = "GREEN"
NOT_GREEN_STATUSES = {"RED", "YELLOW", "BLUE"}  # statuses that generate an alert


def _set_stage(jobs, job_object_id, stage: str):
    jobs.update_one({"_id": job_object_id}, {"$set": {"currentStage": stage}})


def process_financial_batch(
    job_id: str, filename: str, column_mapping: dict[str, str] | None = None, default_fc_name: str | None = None
):
    """Runs as a FastAPI BackgroundTask (no Celery/Redis dependency, same as
    every other module). Every FC-date row is isolated inside its own
    try/except and the final status update runs in a finally block — one
    bad row must never leave the batch stuck in PROCESSING forever."""
    db = get_db()
    jobs = db["jobs"]
    daily_collection = db["fc_daily_financials"]
    anomalies_collection = db["financial_anomalies"]
    reports_collection = db["reports"]
    job_object_id = ObjectId(job_id)

    file_path = os.path.join(settings.upload_root, UPLOAD_SUBFOLDER, job_id, filename)

    jobs.update_one({"_id": job_object_id}, {"$set": {"status": "PROCESSING"}})

    successful = 0
    failed = 0
    critical_anomaly_count = 0
    daily_docs: list[dict] = []
    anomaly_docs: list[dict] = []
    insight_docs: list[dict] = []

    try:
        _set_stage(jobs, job_object_id, "File validation")
        if not os.path.exists(file_path):
            jobs.update_one({"_id": job_object_id}, {"$set": {"error": {"message": "Uploaded file could not be found on disk."}}})
            return

        _set_stage(jobs, job_object_id, "Data extraction")
        parse_result = parse_financial_file(file_path, column_mapping=column_mapping, default_fc_name=default_fc_name)

        if not parse_result.rows:
            jobs.update_one(
                {"_id": job_object_id},
                {"$set": {"error": {"message": "; ".join(parse_result.document_errors) or "File could not be parsed."}}},
            )
            return  # still hits `finally` below, which marks the job FAILED

        _set_stage(jobs, job_object_id, "Data normalization")
        total = len(parse_result.rows)
        jobs.update_one({"_id": job_object_id}, {"$set": {"totalRecords": total}})

        _set_stage(jobs, job_object_id, "FC and date grouping")
        rows = sorted(parse_result.rows, key=lambda r: ((r.fc_name or r.fc_id or ""), (r.day or datetime.min.date())))

        _set_stage(jobs, job_object_id, "Target comparison")
        targets = get_targets(db)

        _set_stage(jobs, job_object_id, "CM1 calculation")
        _set_stage(jobs, job_object_id, "CM2 calculation")
        _set_stage(jobs, job_object_id, "Cost percentage calculation")

        for index, row in enumerate(rows, start=1):
            try:
                metrics = calculate_metrics(row)
                date_str = row.day.isoformat() if row.day else None
                fc_name = row.fc_name or row.fc_id or "Unspecified FC"

                row_anomalies = []

                if row.errors:
                    row_anomalies.append(data_quality_anomaly(row.errors))

                cm2_status = classify_cm2_status(metrics.cm2_percentage) if not metrics.revenue_invalid else "UNKNOWN"

                cm1_anomaly = detect_cm_anomaly("cm1", metrics.cm1_percentage, metrics.revenue, targets["cm1"])
                if cm1_anomaly:
                    row_anomalies.append(cm1_anomaly)
                cm2_anomaly = detect_cm_anomaly("cm2", metrics.cm2_percentage, metrics.revenue, targets["cm2"], cm2_status=cm2_status)
                if cm2_anomaly:
                    row_anomalies.append(cm2_anomaly)

                flagged_costs = []
                for category in COST_CATEGORIES:
                    cost_anomaly = detect_cost_anomaly(category, metrics.cost_percentages.get(category), metrics.revenue, targets[category])
                    if cost_anomaly:
                        row_anomalies.append(cost_anomaly)
                        flagged_costs.append(cost_anomaly.metric)

                insight = generate_insight(fc_name, row.day, row_anomalies)

                daily_doc = {
                    "jobId": job_object_id,
                    "moduleId": MODULE_ID,
                    "date": date_str,
                    "fcId": row.fc_id,
                    "fcName": fc_name,
                    "revenue": metrics.revenue,
                    "costAmounts": metrics.cost_amounts,
                    "costPercentages": metrics.cost_percentages,
                    "cm1": metrics.cm1,
                    "cm1Percentage": metrics.cm1_percentage,
                    "cm2": metrics.cm2,
                    "cm2Percentage": metrics.cm2_percentage,
                    "overallStatus": cm2_status,
                    "flaggedCosts": flagged_costs,
                    "rowErrors": row.errors,
                    "insight": {
                        "summary": insight.summary,
                        "topContributors": insight.top_contributors,
                        "recommendedAction": insight.recommended_action,
                    },
                    "createdAt": datetime.now(timezone.utc),
                }
                daily_result = daily_collection.insert_one(dict(daily_doc))
                daily_doc["_id"] = daily_result.inserted_id
                daily_docs.append(daily_doc)

                for anomaly in row_anomalies:
                    # Only a cost-category line item has meaningful
                    # "recurring" semantics the way the spec means it (the
                    # same cost breaching day after day) — CM1/CM2 and
                    # data-quality findings aren't tracked against
                    # flaggedCosts, so they'd always show a streak of 1.
                    recurring_streak = None
                    if anomaly.metric in flagged_costs and date_str:
                        recurring_streak = compute_recurring_streak(
                            daily_collection, fc_name=fc_name, fc_id=row.fc_id, metric=anomaly.metric, date_str=date_str
                        )

                    anomaly_doc = {
                        "jobId": job_object_id,
                        "moduleId": MODULE_ID,
                        "dailyFinancialId": daily_result.inserted_id,
                        "date": date_str,
                        "fcId": row.fc_id,
                        "fcName": fc_name,
                        "metric": anomaly.metric,
                        "actualValue": anomaly.actual_value,
                        "targetRange": {
                            "minimum": anomaly.target.minimum,
                            "maximum": anomaly.target.maximum,
                            "source": anomaly.target.source,
                        },
                        "deviation": anomaly.deviation,
                        "financialImpact": anomaly.financial_impact,
                        "severity": anomaly.severity,
                        "explanation": anomaly.explanation,
                        "recommendation": anomaly.recommendation,
                        "recurringStreak": recurring_streak,
                        "status": "OPEN",
                        "createdAt": datetime.now(timezone.utc),
                        "updatedAt": datetime.now(timezone.utc),
                    }
                    anomalies_collection.insert_one(dict(anomaly_doc))
                    anomaly_docs.append(anomaly_doc)
                    if anomaly.severity == "CRITICAL":
                        critical_anomaly_count += 1

                if insight.top_contributors or any(a.severity != "INFO" for a in row_anomalies):
                    insight_docs.append(
                        {"fcName": fc_name, "date": date_str, "summary": insight.summary, "topContributors": insight.top_contributors, "recommendedAction": insight.recommended_action}
                    )

                if cm2_status in NOT_GREEN_STATUSES and date_str:
                    dispatch_fc_alert(
                        db,
                        batch_id=job_object_id,
                        fc_id=row.fc_id,
                        fc_name=fc_name,
                        date_str=date_str,
                        status=cm2_status,
                        cm2_percentage=metrics.cm2_percentage,
                        insight_summary=insight.summary,
                    )

                if metrics.revenue_invalid:
                    failed += 1
                else:
                    successful += 1

            except Exception as exc:  # noqa: BLE001 - one row must never kill the batch
                logger.exception("Unexpected error processing row %s (job %s)", row.row_number, job_id)
                failed += 1

            progress = round((index / total) * 90) if total else 90
            jobs.update_one(
                {"_id": job_object_id},
                {"$set": {"processedRecords": index, "successfulRecords": successful, "failedRecords": failed, "progressPercentage": progress}},
            )

        _set_stage(jobs, job_object_id, "Anomaly detection")
        _set_stage(jobs, job_object_id, "Insight generation")
        _set_stage(jobs, job_object_id, "Daily digest generation")

        report_dir = os.path.join(settings.upload_root, "reports", MODULE_ID)
        os.makedirs(report_dir, exist_ok=True)
        report_path = os.path.join(report_dir, f"{job_id}.xlsx")
        targets_for_report = {metric: {"minimum": t.minimum, "maximum": t.maximum, "source": t.source} for metric, t in targets.items()}
        generate_excel_report(job_id, daily_docs, anomaly_docs, insight_docs, targets_for_report, report_path)

        reports_collection.update_one(
            {"jobId": job_object_id, "moduleId": MODULE_ID, "type": "xlsx"},
            {"$set": {"filePath": report_path, "createdAt": datetime.now(timezone.utc)}},
            upsert=True,
        )

        csv_path = os.path.join(report_dir, f"{job_id}.csv")
        generate_csv_report(daily_docs, csv_path)
        reports_collection.update_one(
            {"jobId": job_object_id, "moduleId": MODULE_ID, "type": "csv"},
            {"$set": {"filePath": csv_path, "createdAt": datetime.now(timezone.utc)}},
            upsert=True,
        )

        fc_ids = {d["fcName"] for d in daily_docs}
        cm1_values = [d["cm1Percentage"] for d in daily_docs if d["cm1Percentage"] is not None]
        cm2_values = [d["cm2Percentage"] for d in daily_docs if d["cm2Percentage"] is not None]
        summary = {
            "totalFCs": len(fc_ids),
            "totalRevenue": round(sum(d["revenue"] for d in daily_docs), 2),
            "averageCm1Percentage": round(sum(cm1_values) / len(cm1_values), 2) if cm1_values else None,
            "averageCm2Percentage": round(sum(cm2_values) / len(cm2_values), 2) if cm2_values else None,
            "statusCounts": {
                status: sum(1 for d in daily_docs if d["overallStatus"] == status) for status in ("RED", "YELLOW", "GREEN", "BLUE", "UNKNOWN")
            },
            "totalAnomalies": len(anomaly_docs),
        }
        jobs.update_one({"_id": job_object_id}, {"$set": {"progressPercentage": 100, "summary": summary}})

    except Exception as exc:  # noqa: BLE001 - must never leave the job stuck in PROCESSING
        logger.exception("Unexpected error processing financial batch %s", job_id)
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

        if final_status == "FAILED":
            notify(
                job_id=job_id,
                module_id=MODULE_ID,
                type_="PROCESSING_FAILED",
                severity="CRITICAL",
                title="Financial batch failed",
                message="This financial file could not be processed — see job error details.",
                dedupe_key=f"financial-job-done:{job_id}",
            )
        elif critical_anomaly_count > 0:
            notify(
                job_id=job_id,
                module_id=MODULE_ID,
                type_="FINANCIAL_CRITICAL_ANOMALY",
                severity="CRITICAL",
                title="Critical FC financial anomalies detected",
                message=f"{critical_anomaly_count} critical anomaly(ies) found across this batch — review the Anomaly Management page.",
                dedupe_key=f"financial-job-done:{job_id}",
            )
        else:
            notify(
                job_id=job_id,
                module_id=MODULE_ID,
                type_="PROCESSING_COMPLETED",
                severity="SUCCESS",
                title="Financial batch completed",
                message=f"{successful} day(s) processed with no critical anomalies.",
                dedupe_key=f"financial-job-done:{job_id}",
            )

        if daily_docs:
            notify(
                job_id=job_id,
                module_id=MODULE_ID,
                type_="FINANCIAL_DIGEST_READY",
                severity="INFO",
                title="Daily FC digest available",
                message=f"Digest generated for {len({d['fcName'] for d in daily_docs})} FC(s) across {len(daily_docs)} day(s).",
                dedupe_key=f"financial-digest-ready:{job_id}",
            )
