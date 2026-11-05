from __future__ import annotations

from app.modules.fc_financial_monitor.schemas.models import CM1_COST_CATEGORIES, CM2_ONLY_COST_CATEGORIES, COST_CATEGORIES, CalculatedMetrics, FinancialRow

ROUND_DP = 2


def _safe_percentage(amount: float, revenue: float) -> float | None:
    """Never divides by zero or a negative/missing revenue — returns None
    instead of a misleading percentage (e.g. a huge or negative-looking
    number) when revenue can't meaningfully be the denominator."""
    if revenue is None or revenue <= 0:
        return None
    return round((amount / revenue) * 100, ROUND_DP)


def calculate_metrics(row: FinancialRow) -> CalculatedMetrics:
    """Pure, deterministic financial calculation — no LLM, no side effects.
    Missing/invalid individual cost fields are treated as 0 for the purpose
    of arithmetic (so CM1/CM2 can still be computed from what IS known),
    but the caller is responsible for surfacing row.errors as a data-quality
    anomaly — this function never hides that a value was substituted."""
    revenue = row.revenue if row.revenue is not None and row.revenue > 0 else 0.0
    revenue_invalid = row.revenue is None or row.revenue <= 0

    cost_amounts: dict[str, float] = {}
    for field in COST_CATEGORIES:
        value = getattr(row, field)
        cost_amounts[field] = round(value, ROUND_DP) if value is not None and value >= 0 else 0.0

    cost_percentages: dict[str, float | None] = {
        field: _safe_percentage(cost_amounts[field], revenue) for field in COST_CATEGORIES
    }

    cm1_costs = sum(cost_amounts[f] for f in CM1_COST_CATEGORIES)
    cm1 = round(revenue - cm1_costs, ROUND_DP)
    cm1_percentage = _safe_percentage(cm1, revenue)

    cm2_only_costs = sum(cost_amounts[f] for f in CM2_ONLY_COST_CATEGORIES)
    cm2 = round(cm1 - cm2_only_costs, ROUND_DP)
    cm2_percentage = _safe_percentage(cm2, revenue)

    return CalculatedMetrics(
        revenue=round(row.revenue, ROUND_DP) if row.revenue is not None else 0.0,
        cost_amounts=cost_amounts,
        cost_percentages=cost_percentages,
        cm1=cm1,
        cm1_percentage=cm1_percentage,
        cm2=cm2,
        cm2_percentage=cm2_percentage,
        revenue_invalid=revenue_invalid,
    )
