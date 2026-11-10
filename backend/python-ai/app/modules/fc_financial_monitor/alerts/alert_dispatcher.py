from __future__ import annotations

import logging
import os
import smtplib
import time
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

EMAIL_MAX_ATTEMPTS = 2
EMAIL_RETRY_DELAY_SECONDS = 2
WHATSAPP_API_VERSION = "v21.0"

# Every channel is optional and free-tier friendly: Slack via an incoming
# webhook URL (free), email via any SMTP server the deployer already has
# access to (no paid API), WhatsApp via the official Meta WhatsApp
# Business Cloud API's free tier (a paid provider is never bundled).
# None of these are required for the module to work: unconfigured channels
# are recorded as PENDING_CONFIGURATION, never silently skipped and never
# reported as sent.


def _get_fc_manager(db, fc_name: str) -> dict:
    """Per-FC recipient override, configured via the Target-Configuration-
    style "FC Manager Contacts" screen — falls back to the global env vars
    below when an FC has no manager configured (or no `db` was passed,
    e.g. from an older/simpler call site)."""
    if db is None or not fc_name:
        return {}
    return db["fc_managers"].find_one({"fcName": fc_name}) or {}


def _slack_configured(override_webhook: str | None = None) -> str | None:
    return override_webhook or os.getenv("FINANCIAL_ALERT_SLACK_WEBHOOK_URL") or None


def _email_configured(override_to: str | None = None) -> dict | None:
    host = os.getenv("FINANCIAL_ALERT_SMTP_HOST")
    to_addr = override_to or os.getenv("FINANCIAL_ALERT_EMAIL_TO")
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


def _whatsapp_configured(override_to: str | None = None) -> dict | None:
    """The real Meta WhatsApp Business Cloud API, not a generic webhook —
    needs an access token + the sender's phone_number_id (both from a free
    Meta developer app) plus an approved message template, since the Cloud
    API only allows template messages outside a 24h customer-initiated
    session window. `to` is the recipient's WhatsApp number (E.164, no
    leading +)."""
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    to_number = override_to or os.getenv("FINANCIAL_ALERT_WHATSAPP_TO")
    if not access_token or not phone_number_id or not to_number:
        return None
    return {
        "access_token": access_token,
        "phone_number_id": phone_number_id,
        "to": to_number,
        "template_name": os.getenv("WHATSAPP_TEMPLATE_NAME", "nexusops_fc_alert"),
        "template_lang": os.getenv("WHATSAPP_TEMPLATE_LANG", "en_US"),
    }


def _send_slack(webhook_url: str, message: str) -> tuple[str, str | None]:
    try:
        response = requests.post(webhook_url, json={"text": message}, timeout=5)
        if response.status_code >= 400:
            return FAILED, f"Slack webhook returned HTTP {response.status_code}"
        return SENT, None
    except Exception as exc:  # noqa: BLE001 - delivery failure must never crash the batch
        return FAILED, str(exc)


def _send_email(config: dict, subject: str, message: str) -> tuple[str, str | None]:
    # A local-only test mode: setting FINANCIAL_ALERT_SMTP_HOST=console
    # writes the email to the application log instead of attempting real
    # SMTP — useful for verifying the templating/recipient-routing logic
    # end to end without a real mailbox, and clearly never claimed as a
    # real delivery beyond this process's own log.
    if config["host"].strip().lower() == "console":
        logger.info("LOCAL TEST MODE email to %s — Subject: %s\n%s", config["to_addr"], subject, message)
        return SENT, None

    last_error = None
    for attempt in range(1, EMAIL_MAX_ATTEMPTS + 1):
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
            last_error = str(exc)
            logger.error("Email delivery attempt %d/%d to %s failed: %s", attempt, EMAIL_MAX_ATTEMPTS, config["to_addr"], last_error)
            if attempt < EMAIL_MAX_ATTEMPTS:
                time.sleep(EMAIL_RETRY_DELAY_SECONDS)
    return FAILED, last_error


def _send_whatsapp(config: dict, message: str) -> tuple[str, str | None]:
    url = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}/{config['phone_number_id']}/messages"
    # Template messages take positional {{1}}-style parameters, not a raw
    # freeform body — the approved template (created once in Meta Business
    # Manager, name configurable via WHATSAPP_TEMPLATE_NAME) is expected to
    # have a single body parameter for the full alert text.
    payload = {
        "messaging_product": "whatsapp",
        "to": config["to"],
        "type": "template",
        "template": {
            "name": config["template_name"],
            "language": {"code": config["template_lang"]},
            "components": [{"type": "body", "parameters": [{"type": "text", "text": message}]}],
        },
    }
    try:
        response = requests.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {config['access_token']}"},
            timeout=10,
        )
        if response.status_code >= 400:
            try:
                detail = response.json().get("error", {}).get("message", response.text)
            except Exception:  # noqa: BLE001
                detail = response.text
            return FAILED, f"WhatsApp Cloud API returned HTTP {response.status_code}: {detail}"
        return SENT, None
    except Exception as exc:  # noqa: BLE001 - delivery failure must never crash the batch
        return FAILED, str(exc)


def build_alert_message(fc_name: str, day_str: str, status: str, cm2_percentage, insight_summary: str) -> str:
    cm2_str = f"{cm2_percentage:.1f}%" if cm2_percentage is not None else "N/A"
    return f"[NexusOps · FC Financial Monitor] {fc_name} — {day_str} — Status: {status} (CM2 {cm2_str})\n{insight_summary}"


def dispatch_fc_alert(db, *, batch_id, fc_id, fc_name: str, date_str: str, status: str, cm2_percentage, insight_summary: str):
    """Creates one FinancialAlert document per channel for this FC-date,
    skipping any channel that already has an alert for the exact same
    (batchId, fcId, date) combination — the de-duplication key the spec
    requires. Returns the list of alert documents created (empty if this
    FC-date was already alerted).

    Looks up a per-FC manager contact (fc_managers collection) first,
    falling back to the global env-var configuration for any channel the
    FC-specific manager hasn't configured — e.g. an FC with a manager
    email but no manager phone still gets WhatsApp via the global
    FINANCIAL_ALERT_WHATSAPP_TO, if that's set."""
    alerts_collection = db["financial_alerts"]
    message = build_alert_message(fc_name, date_str, status, cm2_percentage, insight_summary)
    manager = _get_fc_manager(db, fc_name)
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
            webhook = _slack_configured(manager.get("slackWebhookUrl"))
            delivery_status, error = _send_slack(webhook, message) if webhook else (PENDING_CONFIGURATION, None)
        elif channel == CHANNEL_EMAIL:
            config = _email_configured(manager.get("managerEmail"))
            delivery_status, error = (
                _send_email(config, f"NexusOps Alert: {fc_name} — {status}", message) if config else (PENDING_CONFIGURATION, None)
            )
        else:  # WHATSAPP
            config = _whatsapp_configured(manager.get("managerPhone"))
            delivery_status, error = _send_whatsapp(config, message) if config else (PENDING_CONFIGURATION, None)

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
