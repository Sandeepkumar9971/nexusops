import mongomock

from app.modules.fc_financial_monitor.alerts.alert_dispatcher import (
    CHANNEL_EMAIL,
    CHANNEL_IN_APP,
    CHANNEL_SLACK,
    CHANNEL_WHATSAPP,
    PENDING_CONFIGURATION,
    SENT,
    dispatch_fc_alert,
)


def _dispatch(db, **overrides):
    defaults = dict(
        batch_id="batch-1",
        fc_id=None,
        fc_name="Beta",
        date_str="2026-01-01",
        status="RED",
        cm2_percentage=5.0,
        insight_summary="CM2 was critically low.",
    )
    defaults.update(overrides)
    return dispatch_fc_alert(db, **defaults)


def test_in_app_alert_is_always_sent_with_no_configuration():
    db = mongomock.MongoClient().db
    created = _dispatch(db)
    in_app = next(a for a in created if a["channel"] == CHANNEL_IN_APP)
    assert in_app["deliveryStatus"] == SENT
    assert in_app["sentAt"] is not None


def test_unconfigured_channels_are_pending_not_falsely_sent(monkeypatch):
    for var in (
        "FINANCIAL_ALERT_SLACK_WEBHOOK_URL",
        "FINANCIAL_ALERT_SMTP_HOST",
        "FINANCIAL_ALERT_EMAIL_TO",
        "FINANCIAL_ALERT_WHATSAPP_WEBHOOK_URL",
    ):
        monkeypatch.delenv(var, raising=False)

    db = mongomock.MongoClient().db
    created = _dispatch(db)

    for channel in (CHANNEL_EMAIL, CHANNEL_SLACK, CHANNEL_WHATSAPP):
        alert = next(a for a in created if a["channel"] == channel)
        assert alert["deliveryStatus"] == PENDING_CONFIGURATION
        assert alert["sentAt"] is None


def test_configured_slack_webhook_actually_attempts_delivery(monkeypatch):
    monkeypatch.setenv("FINANCIAL_ALERT_SLACK_WEBHOOK_URL", "https://hooks.slack.test/fake")

    calls = []

    class FakeResponse:
        status_code = 200

    def fake_post(url, json=None, timeout=None):
        calls.append((url, json))
        return FakeResponse()

    monkeypatch.setattr("app.modules.fc_financial_monitor.alerts.alert_dispatcher.requests.post", fake_post)

    db = mongomock.MongoClient().db
    created = _dispatch(db)
    slack_alert = next(a for a in created if a["channel"] == CHANNEL_SLACK)
    assert slack_alert["deliveryStatus"] == SENT
    assert len(calls) == 1
    assert calls[0][0] == "https://hooks.slack.test/fake"


def test_failed_delivery_is_reported_as_failed_not_sent(monkeypatch):
    monkeypatch.setenv("FINANCIAL_ALERT_SLACK_WEBHOOK_URL", "https://hooks.slack.test/fake")

    def fake_post(url, json=None, timeout=None):
        raise ConnectionError("network unreachable")

    monkeypatch.setattr("app.modules.fc_financial_monitor.alerts.alert_dispatcher.requests.post", fake_post)

    db = mongomock.MongoClient().db
    created = _dispatch(db)
    slack_alert = next(a for a in created if a["channel"] == CHANNEL_SLACK)
    assert slack_alert["deliveryStatus"] == "FAILED"
    assert "network unreachable" in slack_alert["deliveryError"]


def test_duplicate_fc_date_does_not_create_a_second_alert():
    db = mongomock.MongoClient().db
    first = _dispatch(db)
    second = _dispatch(db)
    assert len(first) == 4  # one per channel
    assert len(second) == 0  # already alerted — never duplicated
    assert db["financial_alerts"].count_documents({}) == 4


def test_whatsapp_cloud_api_actually_attempts_delivery(monkeypatch):
    monkeypatch.setenv("WHATSAPP_ACCESS_TOKEN", "fake-token")
    monkeypatch.setenv("WHATSAPP_PHONE_NUMBER_ID", "123456")
    monkeypatch.setenv("FINANCIAL_ALERT_WHATSAPP_TO", "919999999999")

    calls = []

    class FakeResponse:
        status_code = 200

        def json(self):
            return {}

    def fake_post(url, json=None, headers=None, timeout=None):
        calls.append((url, json, headers))
        return FakeResponse()

    monkeypatch.setattr("app.modules.fc_financial_monitor.alerts.alert_dispatcher.requests.post", fake_post)

    db = mongomock.MongoClient().db
    created = _dispatch(db)
    whatsapp_alert = next(a for a in created if a["channel"] == CHANNEL_WHATSAPP)
    assert whatsapp_alert["deliveryStatus"] == SENT
    assert len(calls) == 1
    url, payload, headers = calls[0]
    assert "graph.facebook.com" in url
    assert "123456" in url
    assert payload["to"] == "919999999999"
    assert payload["type"] == "template"
    assert headers["Authorization"] == "Bearer fake-token"


def test_whatsapp_api_error_is_reported_as_failed(monkeypatch):
    monkeypatch.setenv("WHATSAPP_ACCESS_TOKEN", "fake-token")
    monkeypatch.setenv("WHATSAPP_PHONE_NUMBER_ID", "123456")
    monkeypatch.setenv("FINANCIAL_ALERT_WHATSAPP_TO", "919999999999")

    class FakeResponse:
        status_code = 400
        text = "Bad Request"

        def json(self):
            return {"error": {"message": "Template not found"}}

    monkeypatch.setattr(
        "app.modules.fc_financial_monitor.alerts.alert_dispatcher.requests.post",
        lambda *a, **k: FakeResponse(),
    )

    db = mongomock.MongoClient().db
    created = _dispatch(db)
    whatsapp_alert = next(a for a in created if a["channel"] == CHANNEL_WHATSAPP)
    assert whatsapp_alert["deliveryStatus"] == "FAILED"
    assert "Template not found" in whatsapp_alert["deliveryError"]


def test_per_fc_manager_email_overrides_global_recipient(monkeypatch):
    monkeypatch.setenv("FINANCIAL_ALERT_SMTP_HOST", "console")
    monkeypatch.delenv("FINANCIAL_ALERT_EMAIL_TO", raising=False)

    db = mongomock.MongoClient().db
    db["fc_managers"].insert_one({"fcName": "Beta", "managerEmail": "beta-manager@example.com"})

    created = _dispatch(db)
    email_alert = next(a for a in created if a["channel"] == CHANNEL_EMAIL)
    # No global FINANCIAL_ALERT_EMAIL_TO is set — only the per-FC manager's
    # email makes this channel configured at all.
    assert email_alert["deliveryStatus"] == SENT


def test_email_local_console_mode_marks_sent_without_real_smtp(monkeypatch):
    monkeypatch.setenv("FINANCIAL_ALERT_SMTP_HOST", "console")
    monkeypatch.setenv("FINANCIAL_ALERT_EMAIL_TO", "manager@example.com")

    def fail_if_called(*a, **k):
        raise AssertionError("smtplib.SMTP must not be called in console test mode")

    monkeypatch.setattr("app.modules.fc_financial_monitor.alerts.alert_dispatcher.smtplib.SMTP", fail_if_called)

    db = mongomock.MongoClient().db
    created = _dispatch(db)
    email_alert = next(a for a in created if a["channel"] == CHANNEL_EMAIL)
    assert email_alert["deliveryStatus"] == SENT


def test_email_retries_on_failure_before_giving_up(monkeypatch):
    monkeypatch.setenv("FINANCIAL_ALERT_SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("FINANCIAL_ALERT_EMAIL_TO", "manager@example.com")
    monkeypatch.setattr("app.modules.fc_financial_monitor.alerts.alert_dispatcher.time.sleep", lambda *_: None)

    attempts = []

    class FakeSMTP:
        def __init__(self, *a, **k):
            attempts.append(1)
            raise ConnectionRefusedError("connection refused")

    monkeypatch.setattr("app.modules.fc_financial_monitor.alerts.alert_dispatcher.smtplib.SMTP", FakeSMTP)

    db = mongomock.MongoClient().db
    created = _dispatch(db)
    email_alert = next(a for a in created if a["channel"] == CHANNEL_EMAIL)
    assert email_alert["deliveryStatus"] == "FAILED"
    assert len(attempts) == 2  # EMAIL_MAX_ATTEMPTS
    assert "connection refused" in email_alert["deliveryError"]
