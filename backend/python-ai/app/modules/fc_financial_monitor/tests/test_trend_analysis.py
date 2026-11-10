import mongomock

from app.modules.fc_financial_monitor.anomaly_detection.trend_analysis import compute_recurring_streak


def _insert_day(collection, date_str, flagged_costs, fc_name="Alpha"):
    collection.insert_one({"fcName": fc_name, "date": date_str, "flaggedCosts": flagged_costs})


def test_first_occurrence_has_streak_of_one():
    db = mongomock.MongoClient().db
    streak = compute_recurring_streak(db["fc_daily_financials"], fc_name="Alpha", fc_id=None, metric="Manpower Cost", date_str="2026-01-05")
    assert streak == 1


def test_three_consecutive_prior_breaches_extend_the_streak():
    db = mongomock.MongoClient().db
    collection = db["fc_daily_financials"]
    _insert_day(collection, "2026-01-01", ["Manpower Cost"])
    _insert_day(collection, "2026-01-02", ["Manpower Cost"])
    _insert_day(collection, "2026-01-03", ["Manpower Cost"])

    streak = compute_recurring_streak(collection, fc_name="Alpha", fc_id=None, metric="Manpower Cost", date_str="2026-01-04")
    assert streak == 4  # 3 prior days + today


def test_a_gap_resets_the_streak():
    db = mongomock.MongoClient().db
    collection = db["fc_daily_financials"]
    _insert_day(collection, "2026-01-01", ["Manpower Cost"])
    _insert_day(collection, "2026-01-02", [])  # clean day breaks the streak
    _insert_day(collection, "2026-01-03", ["Manpower Cost"])

    streak = compute_recurring_streak(collection, fc_name="Alpha", fc_id=None, metric="Manpower Cost", date_str="2026-01-04")
    assert streak == 2  # only 01-03 and today


def test_a_different_metric_breaching_does_not_count():
    db = mongomock.MongoClient().db
    collection = db["fc_daily_financials"]
    _insert_day(collection, "2026-01-01", ["Packaging Cost"])

    streak = compute_recurring_streak(collection, fc_name="Alpha", fc_id=None, metric="Manpower Cost", date_str="2026-01-02")
    assert streak == 1


def test_different_fc_history_is_never_mixed_in():
    db = mongomock.MongoClient().db
    collection = db["fc_daily_financials"]
    _insert_day(collection, "2026-01-01", ["Manpower Cost"], fc_name="Beta")

    streak = compute_recurring_streak(collection, fc_name="Alpha", fc_id=None, metric="Manpower Cost", date_str="2026-01-02")
    assert streak == 1


def test_fc_id_is_preferred_over_fc_name_when_present():
    db = mongomock.MongoClient().db
    collection = db["fc_daily_financials"]
    collection.insert_one({"fcId": "FC-1", "fcName": "Alpha Warehouse", "date": "2026-01-01", "flaggedCosts": ["Manpower Cost"]})

    streak = compute_recurring_streak(collection, fc_name="Alpha Warehouse (renamed)", fc_id="FC-1", metric="Manpower Cost", date_str="2026-01-02")
    assert streak == 2
