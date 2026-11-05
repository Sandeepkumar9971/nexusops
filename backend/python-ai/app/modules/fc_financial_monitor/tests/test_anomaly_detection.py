from app.modules.fc_financial_monitor.anomaly_detection.engine import (
    classify_cm2_status,
    data_quality_anomaly,
    detect_cm_anomaly,
    detect_cost_anomaly,
)
from app.modules.fc_financial_monitor.schemas.models import TargetRange

CM1_TARGET = TargetRange(metric="cm1", minimum=65, maximum=70, source="specification")
CM2_TARGET = TargetRange(metric="cm2", minimum=15, maximum=30, source="specification")
UNCONFIGURED = TargetRange(metric="manpower_cost", source="unconfigured")
MANPOWER_TARGET = TargetRange(metric="manpower_cost", minimum=18, maximum=24, source="default-estimate")


# --- CM2 colour classification: every boundary from the spec's table ---


def test_cm2_status_red_below_12():
    assert classify_cm2_status(11.9) == "RED"
    assert classify_cm2_status(0) == "RED"


def test_cm2_status_yellow_12_to_14_9():
    assert classify_cm2_status(12.0) == "YELLOW"
    assert classify_cm2_status(14.9) == "YELLOW"


def test_cm2_status_green_15_to_30():
    assert classify_cm2_status(15.0) == "GREEN"
    assert classify_cm2_status(30.0) == "GREEN"
    assert classify_cm2_status(22.0) == "GREEN"


def test_cm2_status_yellow_above_30_below_33():
    assert classify_cm2_status(30.01) == "YELLOW"
    assert classify_cm2_status(32.9) == "YELLOW"
    # The spec's table leaves an undefined gap between "32.9%" and "33%" at
    # higher decimal precision — this is resolved as a continuous boundary
    # at exactly 33.0, so 32.95% (inside that literal gap) is still YELLOW.
    assert classify_cm2_status(32.95) == "YELLOW"
    assert classify_cm2_status(32.999) == "YELLOW"


def test_cm2_status_blue_at_and_above_33():
    assert classify_cm2_status(33.0) == "BLUE"
    assert classify_cm2_status(50.0) == "BLUE"


def test_cm2_status_unknown_when_revenue_invalid():
    assert classify_cm2_status(None) == "UNKNOWN"


# --- CM1/CM2 anomaly detection: ±3pp tolerance beyond the target range ---


def test_cm1_within_tolerance_is_not_flagged():
    assert detect_cm_anomaly("cm1", 63.0, 100000, CM1_TARGET) is None  # 2pp below min — within 3pp tolerance
    assert detect_cm_anomaly("cm1", 72.0, 100000, CM1_TARGET) is None  # 2pp above max


def test_cm1_exactly_at_tolerance_boundary_is_not_flagged():
    assert detect_cm_anomaly("cm1", 62.0, 100000, CM1_TARGET) is None  # exactly 3pp below min


def test_cm1_beyond_tolerance_is_flagged():
    anomaly = detect_cm_anomaly("cm1", 60.0, 100000, CM1_TARGET)
    assert anomaly is not None
    assert anomaly.deviation == -5.0
    assert anomaly.severity == "HIGH"


def test_cm1_far_beyond_tolerance_is_critical():
    anomaly = detect_cm_anomaly("cm1", 50.0, 100000, CM1_TARGET)  # 15pp below min, > 2x tolerance
    assert anomaly.severity == "CRITICAL"


def test_cm2_breach_computes_financial_impact():
    anomaly = detect_cm_anomaly("cm2", 5.0, 100000, CM2_TARGET, cm2_status="RED")
    assert anomaly.deviation == -10.0
    assert anomaly.financial_impact == -10000.0
    assert anomaly.severity == "CRITICAL"  # RED status forces CRITICAL even if deviation alone wouldn't


def test_cm2_above_target_flags_potential_underreporting():
    anomaly = detect_cm_anomaly("cm2", 35.0, 100000, CM2_TARGET)
    assert anomaly is not None
    assert anomaly.deviation == 5.0
    assert "underreported" in anomaly.explanation.lower()


def test_unconfigured_cm_target_reports_cannot_evaluate_not_invented():
    anomaly = detect_cm_anomaly("cm1", 50.0, 100000, UNCONFIGURED)
    assert anomaly.severity == "INFO"
    assert "no target range is configured" in anomaly.explanation.lower()


# --- Cost-category anomaly detection: no tolerance, any deviation flags ---


def test_cost_within_target_is_not_flagged():
    assert detect_cost_anomaly("manpower_cost", 20.0, 100000, MANPOWER_TARGET) is None
    assert detect_cost_anomaly("manpower_cost", 18.0, 100000, MANPOWER_TARGET) is None  # at the boundary
    assert detect_cost_anomaly("manpower_cost", 24.0, 100000, MANPOWER_TARGET) is None


def test_cost_even_slightly_outside_target_is_flagged():
    anomaly = detect_cost_anomaly("manpower_cost", 24.1, 100000, MANPOWER_TARGET)
    assert anomaly is not None
    assert anomaly.severity == "MEDIUM"
    assert round(anomaly.deviation, 2) == 0.1


def test_cost_below_minimum_is_also_flagged():
    anomaly = detect_cost_anomaly("manpower_cost", 10.0, 100000, MANPOWER_TARGET)
    assert anomaly is not None
    assert anomaly.deviation == -8.0
    assert "below its configured minimum" in anomaly.recommendation.lower()


def test_unconfigured_cost_target_reports_cannot_evaluate():
    anomaly = detect_cost_anomaly("manpower_cost", 50.0, 100000, UNCONFIGURED)
    assert anomaly.severity == "INFO"


# --- Data quality anomaly ---


def test_data_quality_anomaly_lists_the_errors():
    anomaly = data_quality_anomaly(["negative manpower cost: -5000", "missing date"])
    assert anomaly.severity == "HIGH"
    assert "negative manpower cost" in anomaly.explanation
    assert "missing date" in anomaly.explanation
