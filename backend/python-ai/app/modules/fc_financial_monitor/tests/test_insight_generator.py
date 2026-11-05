from datetime import date

from app.modules.fc_financial_monitor.anomaly_detection.engine import detect_cm_anomaly, detect_cost_anomaly
from app.modules.fc_financial_monitor.insights.insight_generator import generate_insight
from app.modules.fc_financial_monitor.schemas.models import TargetRange

CM2_TARGET = TargetRange(metric="cm2", minimum=15, maximum=30, source="specification")
MANPOWER_TARGET = TargetRange(metric="manpower_cost", minimum=18, maximum=24, source="default-estimate")
POWER_TARGET = TargetRange(metric="power_and_fuel", minimum=4, maximum=6, source="default-estimate")


def test_no_anomalies_gives_a_clean_summary():
    insight = generate_insight("Alpha", date(2026, 1, 1), [])
    assert "no anomalies" in insight.summary.lower()
    assert insight.top_contributors == []


def test_cm2_breach_insight_names_date_and_top_contributors():
    cm2_anomaly = detect_cm_anomaly("cm2", 10.1, 100000, CM2_TARGET)
    manpower_anomaly = detect_cost_anomaly("manpower_cost", 32.8, 100000, MANPOWER_TARGET)
    power_anomaly = detect_cost_anomaly("power_and_fuel", 15.2, 100000, POWER_TARGET)

    insight = generate_insight("Beta", date(2026, 5, 27), [cm2_anomaly, manpower_anomaly, power_anomaly])

    assert "May 27" in insight.summary
    assert "10.1%" in insight.summary
    assert len(insight.top_contributors) == 2
    # Manpower's deviation (32.8-24=8.8pp) carries more financial impact
    # than Power & Fuel's (15.2-6=9.2pp)... impact is deviation% * revenue,
    # so Power & Fuel (9.2) actually edges out Manpower (8.8) — ranked
    # first regardless of which anomaly was passed in first.
    assert insight.top_contributors[0]["metric"] == "Power & Fuel"
    assert insight.recommended_action  # some actionable recommendation was produced


def test_line_item_only_breach_still_produces_an_insight():
    equipment_anomaly = detect_cost_anomaly("equipment_rentals", 8.0, 100000, TargetRange(metric="equipment_rentals", minimum=4, maximum=6, source="default-estimate"))
    insight = generate_insight("Gamma", date(2026, 1, 1), [equipment_anomaly])
    assert "Equipment Rentals" in insight.summary
    assert insight.recommended_action


def test_insight_never_invents_numbers_beyond_what_was_passed_in():
    cm2_anomaly = detect_cm_anomaly("cm2", 35.0, 100000, CM2_TARGET)
    insight = generate_insight("Delta", date(2026, 1, 1), [cm2_anomaly])
    assert "35.0%" in insight.summary
    # No contributor list since no cost-category anomaly was passed in.
    assert insight.top_contributors == []
