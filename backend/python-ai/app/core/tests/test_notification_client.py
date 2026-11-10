from app.core import notification_client


def test_notify_is_a_noop_without_internal_token(monkeypatch):
    monkeypatch.setattr(notification_client.settings, "internal_api_token", "")

    calls = []
    monkeypatch.setattr(notification_client.requests, "post", lambda *a, **k: calls.append(1))

    notification_client.notify(
        job_id="507f1f77bcf86cd799439011",
        module_id="parcel-intelligence",
        type_="PROCESSING_COMPLETED",
        severity="SUCCESS",
        title="t",
        message="m",
        dedupe_key="k",
    )
    assert calls == []


def test_notify_posts_to_internal_endpoint_when_configured(monkeypatch):
    monkeypatch.setattr(notification_client.settings, "internal_api_token", "test-token")
    monkeypatch.setattr(notification_client.settings, "node_api_base_url", "http://127.0.0.1:4000/api")

    captured = {}

    def fake_post(url, json, headers, timeout):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers

    monkeypatch.setattr(notification_client.requests, "post", fake_post)

    notification_client.notify(
        job_id="507f1f77bcf86cd799439011",
        module_id="fc-financial-monitor",
        type_="FINANCIAL_CRITICAL_ANOMALY",
        severity="CRITICAL",
        title="t",
        message="m",
        dedupe_key="k",
    )

    assert captured["url"] == "http://127.0.0.1:4000/api/internal/notifications"
    assert captured["json"]["jobId"] == "507f1f77bcf86cd799439011"
    assert captured["headers"]["X-Internal-Token"] == "test-token"


def test_notify_never_raises_when_request_fails(monkeypatch):
    monkeypatch.setattr(notification_client.settings, "internal_api_token", "test-token")

    def boom(*a, **k):
        raise ConnectionError("Node API unreachable")

    monkeypatch.setattr(notification_client.requests, "post", boom)

    # Must not raise — a notification failing to send must never fail the
    # job it's reporting on.
    notification_client.notify(
        job_id="507f1f77bcf86cd799439011",
        module_id="employee-compliance",
        type_="PROCESSING_FAILED",
        severity="CRITICAL",
        title="t",
        message="m",
        dedupe_key="k",
    )
