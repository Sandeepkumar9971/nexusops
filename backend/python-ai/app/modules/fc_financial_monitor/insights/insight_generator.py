from __future__ import annotations

from datetime import date as date_type

from app.modules.fc_financial_monitor.schemas.models import Anomaly, Insight

# Rule-based, deterministic text generation — every number quoted here was
# already computed by the calculation/anomaly-detection layers, which this
# module only reads and never recomputes. No LLM call is required for the
# system to work; see the README for how an optional LLM could later be
# substituted purely as a prose-polishing step over these same verified
# facts, never as a source of new numbers.
COST_METRIC_LABELS = {"Manpower Cost", "Packaging Cost", "Power & Fuel", "FC Rent", "Equipment Rentals", "Overheads"}


def _rank_cost_contributors(anomalies: list[Anomaly]) -> list[Anomaly]:
    cost_anomalies = [a for a in anomalies if a.metric in COST_METRIC_LABELS and a.financial_impact is not None]
    return sorted(cost_anomalies, key=lambda a: abs(a.financial_impact), reverse=True)


def generate_insight(fc_name: str | None, day: date_type | None, anomalies: list[Anomaly]) -> Insight:
    actionable = [a for a in anomalies if a.severity != "INFO"]

    if not actionable:
        return Insight(
            date=day,
            fc_name=fc_name,
            summary="No anomalies detected — performance was within all configured target ranges.",
            top_contributors=[],
            recommended_action="No action required.",
        )

    cm_anomalies = [a for a in actionable if a.metric in ("CM1", "CM2")]
    contributors = _rank_cost_contributors(actionable)

    date_str = day.strftime("%B %-d") if day else "this date"
    sentences = []

    for cm in cm_anomalies:
        sentences.append(f"On {date_str}, {cm.explanation}")

    if contributors:
        parts = [f"{c.metric} was {c.actual_value:.1f}%, " + ("above" if c.deviation > 0 else "below") + " its target" for c in contributors[:3]]
        if len(parts) == 1:
            joined = parts[0]
        elif len(parts) == 2:
            joined = f"{parts[0]}, while {parts[1]}"
        else:
            joined = ", ".join(parts[:-1]) + f", and {parts[-1]}"
        sentences.append(f"{joined}. " + ("These cost categories" if len(parts) > 1 else "This cost category") + " contributed significantly to the result.")
    elif not cm_anomalies:
        # Only data-quality or line-item findings without a clear top
        # contributor ranking (e.g. a single flagged cost category).
        for a in actionable[:3]:
            sentences.append(a.explanation)

    recommendations = []
    seen = set()
    source = contributors[:3] if contributors else actionable[:3]
    for a in source:
        if a.recommendation not in seen:
            recommendations.append(a.recommendation)
            seen.add(a.recommendation)

    summary = " ".join(sentences)
    recommended_action = " ".join(recommendations) if recommendations else "Review the flagged metrics for this FC-date."

    top_contributors = [
        {
            "metric": c.metric,
            "actualValue": c.actual_value,
            "deviation": c.deviation,
            "financialImpact": c.financial_impact,
        }
        for c in contributors
    ]

    return Insight(
        date=day,
        fc_name=fc_name,
        summary=summary,
        top_contributors=top_contributors,
        recommended_action=recommended_action,
    )
