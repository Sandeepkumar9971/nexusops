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
