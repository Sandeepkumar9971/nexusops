from __future__ import annotations

import logging
import os
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage

import requests

logger = logging.getLogger(__name__)

PENDING_CONFIGURATION = "PENDING_CONFIGURATION"
SENT = "SENT"
FAILED = "FAILED"

CHANNEL_IN_APP = "IN_APP"
CHANNEL_EMAIL = "EMAIL"
CHANNEL_SLACK = "SLACK"
CHANNEL_WHATSAPP = "WHATSAPP"

# Every channel is optional and free-tier friendly: Slack via an incoming
# webhook URL (free), email via any SMTP server the deployer already has
# access to (no paid API), WhatsApp via a generic webhook URL for whatever
# gateway the deployer configures later (no provider is bundled — the
# WhatsApp Business API itself isn't free, so this module never claims a
# WhatsApp message was sent unless a webhook has actually been configured).
# None of these are required for the module to work: unconfigured channels
# are recorded as PENDING_CONFIGURATION, never silently skipped and never
# reported as sent.


def _slack_configured() -> str | None:
    return os.getenv("FINANCIAL_ALERT_SLACK_WEBHOOK_URL") or None


def _email_configured() -> dict | None:
    host = os.getenv("FINANCIAL_ALERT_SMTP_HOST")
    to_addr = os.getenv("FINANCIAL_ALERT_EMAIL_TO")
    if not host or not to_addr:
        return None
    return {
        "host": host,
        "port": int(os.getenv("FINANCIAL_ALERT_SMTP_PORT", "587")),
        "user": os.getenv("FINANCIAL_ALERT_SMTP_USER"),
        "password": os.getenv("FINANCIAL_ALERT_SMTP_PASSWORD"),
        "from_addr": os.getenv("FINANCIAL_ALERT_EMAIL_FROM", os.getenv("FINANCIAL_ALERT_SMTP_USER", "nexusops@localhost")),
        "to_addr": to_addr,
    }


def _whatsapp_configured() -> str | None:
    return os.getenv("FINANCIAL_ALERT_WHATSAPP_WEBHOOK_URL") or None


def _send_slack(webhook_url: str, message: str) -> tuple[str, str | None]:
    try:
        response = requests.post(webhook_url, json={"text": message}, timeout=5)
        if response.status_code >= 400:
            return FAILED, f"Slack webhook returned HTTP {response.status_code}"
        return SENT, None
    except Exception as exc:  # noqa: BLE001 - delivery failure must never crash the batch
        return FAILED, str(exc)


def _send_email(config: dict, subject: str, message: str) -> tuple[str, str | None]:
    try:
        email = EmailMessage()
        email["Subject"] = subject
        email["From"] = config["from_addr"]
        email["To"] = config["to_addr"]
        email.set_content(message)
        with smtplib.SMTP(config["host"], config["port"], timeout=5) as smtp:
            smtp.starttls()
            if config["user"] and config["password"]:
                smtp.login(config["user"], config["password"])
            smtp.send_message(email)
        return SENT, None
    except Exception as exc:  # noqa: BLE001 - delivery failure must never crash the batch
        return FAILED, str(exc)


def _send_whatsapp(webhook_url: str, message: str) -> tuple[str, str | None]:
    try:
        response = requests.post(webhook_url, json={"message": message}, timeout=5)
        if response.status_code >= 400:
            return FAILED, f"WhatsApp webhook returned HTTP {response.status_code}"
        return SENT, None
    except Exception as exc:  # noqa: BLE001
        return FAILED, str(exc)


def build_alert_message(fc_name: str, day_str: str, status: str, cm2_percentage, insight_summary: str) -> str:
    cm2_str = f"{cm2_percentage:.1f}%" if cm2_percentage is not None else "N/A"
    return f"[NexusOps · FC Financial Monitor] {fc_name} — {day_str} — Status: {status} (CM2 {cm2_str})\n{insight_summary}"


def dispatch_fc_alert(db, *, batch_id, fc_id, fc_name: str, date_str: str, status: str, cm2_percentage, insight_summary: str):
    """Creates one FinancialAlert document per channel for this FC-date,
    skipping any channel that already has an alert for the exact same
    (batchId, fcId, date) combination — the de-duplication key the spec
    requires. Returns the list of alert documents created (empty if this
    FC-date was already alerted)."""
    alerts_collection = db["financial_alerts"]
    message = build_alert_message(fc_name, date_str, status, cm2_percentage, insight_summary)
    created = []

    for channel in (CHANNEL_IN_APP, CHANNEL_EMAIL, CHANNEL_SLACK, CHANNEL_WHATSAPP):
        # fcName is part of the dedupe key (not just fcId) because fcId is
        # often absent — without it, distinct FCs identified only by name
        # would collide on the same (batch, date, channel) key.
        dedupe_filter = {"batchId": batch_id, "fcId": fc_id, "fcName": fc_name, "date": date_str, "channel": channel}
        if alerts_collection.find_one(dedupe_filter):
            continue  # already alerted for this exact FC-date-channel — never duplicate

        if channel == CHANNEL_IN_APP:
            delivery_status, error = SENT, None
        elif channel == CHANNEL_SLACK:
            webhook = _slack_configured()
            delivery_status, error = _send_slack(webhook, message) if webhook else (PENDING_CONFIGURATION, None)
        elif channel == CHANNEL_EMAIL:
            config = _email_configured()
            delivery_status, error = _send_email(config, f"NexusOps Alert: {fc_name} — {status}", message) if config else (PENDING_CONFIGURATION, None)
        else:  # WHATSAPP
            webhook = _whatsapp_configured()
            delivery_status, error = _send_whatsapp(webhook, message) if webhook else (PENDING_CONFIGURATION, None)

        doc = {
            "batchId": batch_id,
            "fcId": fc_id,
            "fcName": fc_name,
            "date": date_str,
            "alertType": status,
            "message": message,
            "channel": channel,
            "deliveryStatus": delivery_status,
            "deliveryError": error,
            "sentAt": datetime.now(timezone.utc) if delivery_status == SENT else None,
            "createdAt": datetime.now(timezone.utc),
        }
        alerts_collection.insert_one(dict(doc))
        created.append(doc)

    return created
