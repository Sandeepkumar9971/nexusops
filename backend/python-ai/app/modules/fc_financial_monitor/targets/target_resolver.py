from __future__ import annotations

from app.modules.fc_financial_monitor.schemas.models import TargetRange

# CM1/CM2 target ranges are given directly in the business rules (not
# invented, not sourced from the unavailable sample file) — they're always
# available even on a brand-new installation with no seeded configuration.
SPECIFIED_CM_TARGETS = {
    "cm1": TargetRange(metric="cm1", minimum=65.0, maximum=70.0, source="specification"),
    "cm2": TargetRange(metric="cm2", minimum=15.0, maximum=30.0, source="specification"),
}

ALL_METRICS = ["cm1", "cm2", "manpower_cost", "packaging_cost", "power_and_fuel", "fc_rent", "equipment_rentals", "overheads"]


def get_targets(db) -> dict[str, TargetRange]:
    """Cost-category targets come from the FinancialTarget collection,
    seeded/edited via the Target Configuration screen — never hardcoded in
    the calculation or anomaly-detection code, per the business rule that
    target ranges must be configurable without a code change. A metric with
    no configured document comes back with is_configured=False rather than
    a guessed range."""
    targets = dict(SPECIFIED_CM_TARGETS)

    configured = {doc["metric"]: doc for doc in db["financial_targets"].find({})}
    for metric in ALL_METRICS:
        if metric in configured:
            doc = configured[metric]
            targets[metric] = TargetRange(
                metric=metric,
                minimum=doc.get("minimum"),
                maximum=doc.get("maximum"),
                source=doc.get("source", "configured"),
            )
        elif metric not in targets:
            targets[metric] = TargetRange(metric=metric, minimum=None, maximum=None, source="unconfigured")

    return targets
