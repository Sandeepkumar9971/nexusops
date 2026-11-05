from app.modules.fc_financial_monitor.calculations.margin_calculations import calculate_metrics
from app.modules.fc_financial_monitor.schemas.models import FinancialRow


def _row(**overrides):
    defaults = dict(
        row_number=1,
        fc_name="Alpha",
        day=None,
        revenue=100000.0,
        manpower_cost=22000.0,
        packaging_cost=10000.0,
        power_and_fuel=5000.0,
        fc_rent=20000.0,
        equipment_rentals=5000.0,
        overheads=16000.0,
        errors=[],
    )
    defaults.update(overrides)
    return FinancialRow(**defaults)


def test_clean_day_cm1_cm2_match_hand_calculation():
    metrics = calculate_metrics(_row())
    assert metrics.cm1 == 68000.0
    assert metrics.cm1_percentage == 68.0
    assert metrics.cm2 == 22000.0
    assert metrics.cm2_percentage == 22.0


def test_cost_percentages_match_hand_calculation():
    metrics = calculate_metrics(_row())
    assert metrics.cost_percentages["manpower_cost"] == 22.0
    assert metrics.cost_percentages["packaging_cost"] == 10.0
    assert metrics.cost_percentages["power_and_fuel"] == 5.0
    assert metrics.cost_percentages["fc_rent"] == 20.0
    assert metrics.cost_percentages["equipment_rentals"] == 5.0
    assert metrics.cost_percentages["overheads"] == 16.0


def test_zero_revenue_never_divides_by_zero():
    metrics = calculate_metrics(_row(revenue=0.0))
    assert metrics.revenue_invalid is True
    assert metrics.cm1_percentage is None
    assert metrics.cm2_percentage is None
    assert all(v is None for v in metrics.cost_percentages.values())
    # Raw CM1/CM2 rupee amounts are still computed from what IS known —
    # only the percentage (which needs revenue as a denominator) is unsafe.
    assert metrics.cm1 == -32000.0


def test_missing_revenue_is_treated_as_invalid_not_a_crash():
    metrics = calculate_metrics(_row(revenue=None))
    assert metrics.revenue_invalid is True
    assert metrics.cm1_percentage is None
    assert metrics.cm2_percentage is None


def test_negative_cost_is_substituted_with_zero_for_arithmetic():
    """The parser already flags a negative cost as a row error — the
    calculation layer's job is only to never let a negative cost produce a
    nonsensical inflated CM1/CM2, so it treats it as 0 rather than
    subtracting a negative number (which would increase margin)."""
    metrics = calculate_metrics(_row(manpower_cost=-5000.0))
    assert metrics.cost_amounts["manpower_cost"] == 0.0
    assert metrics.cm1 == 100000.0 - 0.0 - 10000.0


def test_revenue_rounding_is_consistent():
    metrics = calculate_metrics(_row(revenue=100000.126))
    assert metrics.revenue == 100000.13  # rounds to 2dp like every other figure
