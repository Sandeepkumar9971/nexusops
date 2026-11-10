import logging

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)


def notify(*, job_id: str, module_id: str, type_: str, severity: str, title: str, message: str, dedupe_key: str, related_entity=None) -> None:
    """Posts a notification to Node's internal endpoint — Node resolves the
    job's owning user and persists/broadcasts it. Never raises: a
    notification failing to send must never fail or crash the batch it's
    reporting on, same resilience rule as every alert channel in
    alert_dispatcher.py. If INTERNAL_API_TOKEN isn't configured, this is a
    silent no-op (Node's own endpoint would reject it anyway) rather than
    a loud failure in every job's logs."""
    if not settings.internal_api_token:
        return
    try:
        requests.post(
            f"{settings.node_api_base_url}/internal/notifications",
            json={
                "jobId": job_id,
                "moduleId": module_id,
                "type": type_,
                "severity": severity,
                "title": title,
                "message": message,
                "dedupeKey": dedupe_key,
                "relatedEntity": related_entity,
            },
            headers={"X-Internal-Token": settings.internal_api_token},
            timeout=5,
        )
    except Exception as exc:  # noqa: BLE001 - notification delivery is best-effort
        logger.warning("Failed to post notification (job=%s, type=%s): %s", job_id, type_, exc)
