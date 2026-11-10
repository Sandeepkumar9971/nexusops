"""Cross-day memory for anomaly detection: is a cost-line breach on this
FC's first offense, or the Nth day in a row? Reads fc_daily_financials
directly (the same collection every batch persists to, across uploads —
not scoped to one job), so "recurring" means recurring for the FC across
its whole history, not just within the file being processed right now.

Deliberately read-only and additive: this never overwrites a prior day's
stored flaggedCosts/anomalies, it only reads them to annotate today's
anomaly with how long the pattern has been going.
"""

from __future__ import annotations

LOOKBACK_DAYS = 14


def compute_recurring_streak(daily_collection, *, fc_name: str, fc_id, metric: str, date_str: str) -> int:
    """How many consecutive days up to and including `date_str` had this
    exact metric flagged for this FC — 1 means today is the first time,
    3 means today plus the two days immediately before it. Looks back at
    most LOOKBACK_DAYS calendar entries so one very old breach doesn't
    count as part of today's "streak" if it wasn't actually consecutive.
    """
    fc_filter = {"fcId": fc_id} if fc_id else {"fcName": fc_name}
    prior_days = list(
        daily_collection.find(
            {**fc_filter, "date": {"$lt": date_str}},
            {"date": 1, "flaggedCosts": 1},
        )
        .sort("date", -1)
        .limit(LOOKBACK_DAYS)
    )

    streak = 1  # today's own breach counts as day 1 of the streak
    for day_doc in prior_days:
        if metric in (day_doc.get("flaggedCosts") or []):
            streak += 1
        else:
            break  # streak is only ever consecutive — a gap resets it
    return streak
