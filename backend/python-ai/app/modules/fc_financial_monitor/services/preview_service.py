from __future__ import annotations

from app.modules.fc_financial_monitor.normalizers.column_normalizer import FIELD_ORDER
from app.modules.fc_financial_monitor.parsers.financial_parser import parse_financial_file


def preview_financial_file(
    file_path: str, column_mapping: dict[str, str] | None = None, default_fc_name: str | None = None
) -> dict:
    """Parses the file exactly as the real batch would, but only returns a
    summary for the upload workspace's preview step — nothing is persisted.
    Lets the user see detected columns, record/FC counts, and the date
    range before committing to "Process Financial Data"."""
    result = parse_financial_file(file_path, column_mapping=column_mapping, default_fc_name=default_fc_name)

    detected_mapping = {field: result.resolved_mapping.get(field) for field in FIELD_ORDER}

    if not result.rows:
        return {
            "valid": False,
            "errors": result.document_errors,
            "detectedColumns": result.detected_columns,
            "fcIdentifierPresent": result.fc_identifier_present,
            "recordCount": 0,
            "fcCount": 0,
            "dateRange": None,
            "rowIssueCount": 0,
            "detectedMapping": detected_mapping,
            "notes": [],
        }

    fc_names = {r.fc_name or r.fc_id for r in result.rows if (r.fc_name or r.fc_id)}
    days = [r.day for r in result.rows if r.day is not None]
    date_range = {"start": min(days).isoformat(), "end": max(days).isoformat()} if days else None
    row_issue_count = sum(1 for r in result.rows if r.errors)

    return {
        "valid": True,
        "errors": [],
        "detectedColumns": result.detected_columns,
        "fcIdentifierPresent": result.fc_identifier_present,
        "recordCount": len(result.rows),
        "fcCount": len(fc_names),
        "dateRange": date_range,
        "rowIssueCount": row_issue_count,
        "detectedMapping": detected_mapping,
        # Document-level disclosures that aren't errors (e.g. "Day column
        # held sequence numbers, not calendar dates — dates were
        # synthesized") — surfaced so the upload workspace can show them
        # without implying something is wrong with the file.
        "notes": result.document_errors,
    }
