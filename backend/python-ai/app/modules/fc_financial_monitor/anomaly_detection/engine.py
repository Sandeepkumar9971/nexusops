from __future__ import annotations

from app.modules.fc_financial_monitor.schemas.models import Anomaly, TargetRange

# CM1/CM2 are only flagged once the deviation from the target range exceeds
# this tolerance — a reading a point or two outside the range isn't treated
# as a real problem. Cost-category line items have no such cushion (any
# value outside the configured range is flagged) per the business rules.
CM_DEVIATION_TOLERANCE = 3.0

CM2_STATUS_RED = "RED"
CM2_STATUS_YELLOW = "YELLOW"
CM2_STATUS_GREEN = "GREEN"
CM2_STATUS_BLUE = "BLUE"
CM2_STATUS_UNKNOWN = "UNKNOWN"  # revenue was zero/invalid — no percentage to classify

METRIC_LABELS = {
    "cm1": "CM1",
    "cm2": "CM2",
    "manpower_cost": "Manpower Cost",
    "packaging_cost": "Packaging Cost",
    "power_and_fuel": "Power & Fuel",
    "fc_rent": "FC Rent",
    "equipment_rentals": "Equipment Rentals",
    "overheads": "Overheads",
}


def classify_cm2_status(cm2_percentage: float | None) -> str:
    """Daily FC colour classification from CM2%, per the specified
    thresholds:

        < 12%            -> RED
        12%  - 14.9%      -> YELLOW
        15%  - 30%        -> GREEN
        >30% - <33%       -> YELLOW
        >= 33%           -> BLUE

    Boundary note: the spec's table reads "Above 30%-32.9%: Yellow" and
    "Above 33%: Blue", which leaves an undefined gap between 32.9 and 33.0
    at higher decimal precision (e.g. 32.95%). That gap is read as shorthand
    for a continuous boundary at 33.0 — anything from just above 30% up to
    (but not including) 33% is YELLOW, and 33% or higher is BLUE — so every
    possible value has exactly one classification with no undefined range.
    """
    if cm2_percentage is None:
        return CM2_STATUS_UNKNOWN
    if cm2_percentage < 12.0:
        return CM2_STATUS_RED
    if cm2_percentage <= 14.9:
        return CM2_STATUS_YELLOW
    if cm2_percentage <= 30.0:
        return CM2_STATUS_GREEN
    if cm2_percentage < 33.0:
        return CM2_STATUS_YELLOW
    return CM2_STATUS_BLUE


def _deviation_from_range(value: float, minimum: float, maximum: float) -> float:
    """Signed distance outside [minimum, maximum]; 0 if inside. Positive
    means above the range, negative means below it."""
    if value > maximum:
        return round(value - maximum, 2)
    if value < minimum:
        return round(value - minimum, 2)
    return 0.0


def detect_cm_anomaly(metric_key: str, percentage: float | None, revenue: float, target: TargetRange, cm2_status: str | None = None) -> Anomaly | None:
    """CM1/CM2 anomaly detection. Returns None when nothing is worth
    flagging (within tolerance, or revenue was invalid — that case is
    handled separately as a data-quality anomaly, not a margin anomaly)."""
    label = METRIC_LABELS[metric_key]

    if percentage is None:
        return None  # revenue_invalid is reported as its own anomaly

    if not target.is_configured:
        return Anomaly(
            metric=label,
            actual_value=percentage,
            target=target,
            deviation=None,
            financial_impact=None,
            severity="INFO",
            explanation=f"{label} was {percentage:.1f}%, but no target range is configured for {label} yet.",
            recommendation=f"Configure a target range for {label} in Target Configuration to enable evaluation.",
        )

    deviation = _deviation_from_range(percentage, target.minimum, target.maximum)
    if abs(deviation) <= CM_DEVIATION_TOLERANCE:
        return None

    financial_impact = round((deviation / 100) * revenue, 2) if revenue else None
    direction = "above" if deviation > 0 else "below"
    severity = "CRITICAL" if abs(deviation) > CM_DEVIATION_TOLERANCE * 2 or cm2_status == CM2_STATUS_RED else "HIGH"

    if metric_key == "cm2" and direction == "above":
        explanation = (
            f"{label} was {percentage:.1f}%, {abs(deviation):.1f} points above the target maximum of "
            f"{target.maximum:.1f}%. Unusually high margin can indicate underreported or missing costs rather "
            f"than genuinely strong performance."
        )
        recommendation = "Review cost entries for this FC-date for completeness before treating this as a positive result."
    else:
        explanation = (
            f"{label} was {percentage:.1f}%, {abs(deviation):.1f} points {direction} the target range of "
            f"{target.minimum:.1f}%–{target.maximum:.1f}%."
        )
        recommendation = (
            f"Investigate the cost categories driving this {label} shortfall."
            if direction == "below"
            else f"Verify cost entries — {label} is unexpectedly high."
        )

    return Anomaly(
        metric=label,
        actual_value=percentage,
        target=target,
        deviation=deviation,
        financial_impact=financial_impact,
        severity=severity,
        explanation=explanation,
        recommendation=recommendation,
    )


def detect_cost_anomaly(metric_key: str, percentage: float | None, revenue: float, target: TargetRange) -> Anomaly | None:
    """Cost-category line-item anomaly detection — no tolerance band, any
    value outside the configured range is flagged, per the business rule."""
    label = METRIC_LABELS[metric_key]

    if percentage is None:
        return None

    if not target.is_configured:
        return Anomaly(
            metric=label,
            actual_value=percentage,
            target=target,
            deviation=None,
            financial_impact=None,
            severity="INFO",
            explanation=f"{label} was {percentage:.1f}%, but no target range is configured for {label} yet.",
            recommendation=f"Configure a target range for {label} in Target Configuration to enable evaluation.",
        )

    deviation = _deviation_from_range(percentage, target.minimum, target.maximum)
    if deviation == 0:
        return None

    financial_impact = round((deviation / 100) * revenue, 2) if revenue else None
    direction = "above" if deviation > 0 else "below"

    explanation = (
        f"{label} was {percentage:.1f}%, {abs(deviation):.1f} points {direction} its target range of "
        f"{target.minimum:.1f}%–{target.maximum:.1f}%."
    )
    recommendation = (
        f"Review {label.lower()} spend for this FC-date — it is above the configured limit."
        if direction == "above"
        else f"{label} is below its configured minimum — confirm this cost wasn't underreported."
    )

    return Anomaly(
        metric=label,
        actual_value=percentage,
        target=target,
        deviation=deviation,
        financial_impact=financial_impact,
        severity="MEDIUM",
        explanation=explanation,
        recommendation=recommendation,
    )


def data_quality_anomaly(errors: list[str]) -> Anomaly:
    """Raised when a row has missing/invalid/negative fields that were
    substituted (revenue invalid, or a cost field defaulted to 0) — kept
    distinct from a genuine margin/cost anomaly so a data problem is never
    mistaken for an actual financial performance issue."""
    return Anomaly(
        metric="Data Quality",
        actual_value=None,
        target=TargetRange(metric="data_quality", source="n/a"),
        deviation=None,
        financial_impact=None,
        severity="HIGH",
        explanation="This record has data issues: " + "; ".join(errors) + ".",
        recommendation="Verify and re-upload corrected data for this FC-date; figures shown may be incomplete.",
    )
