from __future__ import annotations

from datetime import date as date_type
from typing import Optional

from pydantic import BaseModel

# Cost categories the business rules operate on, in the exact order CM1/CM2
# are built from. Every other module (parser, calculations, targets,
# anomaly detection, reports) imports this list instead of repeating the
# six names — adding a cost category later means changing it in one place.
COST_CATEGORIES = [
    "manpower_cost",
    "packaging_cost",
    "power_and_fuel",
    "fc_rent",
    "equipment_rentals",
    "overheads",
]

# CM1 is only Manpower + Packaging; CM2 subtracts the remaining four.
CM1_COST_CATEGORIES = ["manpower_cost", "packaging_cost"]
CM2_ONLY_COST_CATEGORIES = ["power_and_fuel", "fc_rent", "equipment_rentals", "overheads"]


class FinancialRow(BaseModel):
    """One FC-date record, after parsing and normalization but before any
    calculation — raw inputs only, so a bad calculation can never be
    blamed on bad parsing (and vice versa)."""

    row_number: int
    fc_id: Optional[str] = None
    fc_name: Optional[str] = None
    day: Optional[date_type] = None
    revenue: Optional[float] = None
    manpower_cost: Optional[float] = None
    packaging_cost: Optional[float] = None
    power_and_fuel: Optional[float] = None
    fc_rent: Optional[float] = None
    equipment_rentals: Optional[float] = None
    overheads: Optional[float] = None
    errors: list[str] = []


class ParseResult(BaseModel):
    rows: list[FinancialRow] = []
    document_errors: list[str] = []
    detected_columns: list[str] = []
    fc_identifier_present: bool = True
    # {canonical_field: original_header_text} — whatever match_columns
    # actually resolved, so the upload workspace can show "detected: X" per
    # field and let the user override just the ones that are wrong.
    resolved_mapping: dict[str, str] = {}


class TargetRange(BaseModel):
    metric: str
    minimum: Optional[float] = None
    maximum: Optional[float] = None
    source: str = "unconfigured"

    @property
    def is_configured(self) -> bool:
        return self.minimum is not None and self.maximum is not None


class CalculatedMetrics(BaseModel):
    """Deterministic output of the calculation engine for one FC-date row —
    never touched by the anomaly/insight layers, only read."""

    revenue: float
    cost_amounts: dict[str, float]
    cost_percentages: dict[str, Optional[float]]
    cm1: float
    cm1_percentage: Optional[float]
    cm2: float
    cm2_percentage: Optional[float]
    revenue_invalid: bool = False


class Anomaly(BaseModel):
    metric: str  # "CM1", "CM2", or a cost category key
    actual_value: Optional[float]
    target: TargetRange
    deviation: Optional[float]
    financial_impact: Optional[float]
    severity: str  # CRITICAL | HIGH | MEDIUM | LOW
    explanation: str
    recommendation: str


class Insight(BaseModel):
    date: Optional[date_type]
    fc_name: Optional[str]
    summary: str
    top_contributors: list[dict] = []
    recommended_action: str


class FCDigest(BaseModel):
    fc_id: Optional[str]
    fc_name: Optional[str]
    date: Optional[date_type]
    revenue: float
    cm1: float
    cm1_percentage: Optional[float]
    cm2: float
    cm2_percentage: Optional[float]
    status: str  # RED | YELLOW | GREEN | BLUE
    flagged_costs: list[str] = []
    anomalies: list[Anomaly] = []
    insight: Optional[Insight] = None
