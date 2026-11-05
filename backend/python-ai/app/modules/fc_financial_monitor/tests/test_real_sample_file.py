"""Regression test against the real FC Financial Monitor sample file
(`3excl.xlsx`, provided 2026-11-05) that originally failed to parse at all
— the preview showed only "Unnamed: 0/1/2/3" columns and rejected the file
for missing every required field.

Two real-world issues, now fixed in financial_parser.py, are pinned down
here:
  1. The workbook has two sheets ("Ideal FC Criteria" and "Day Wise PnL"),
     and the data sheet's real header row isn't row 0 — naive
     `sheet_name=0` / `header=0` parsing hit the wrong sheet/row entirely.
  2. The "Day" column holds a bare sequential index (1, 2, 3, …), not
     calendar dates, and there is no FC Name/ID column at all — the whole
     file is one facility's data, identified only via `default_fc_name`.
"""

import os

import pytest

from app.modules.fc_financial_monitor.parsers.financial_parser import parse_financial_file

REAL_SAMPLE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "..", "..", "..", "test-data", "fc-financial-samples", "3excl_real_sample.xlsx"
)


@pytest.fixture
def real_sample_path():
    path = os.path.normpath(REAL_SAMPLE_PATH)
    if not os.path.exists(path):
        pytest.skip("Real 3excl.xlsx sample not present in this checkout.")
    return path


def test_finds_day_wise_pnl_sheet_despite_reference_sheet_and_offset_header(real_sample_path):
    result = parse_financial_file(real_sample_path, default_fc_name="Mumbai FC")
    assert not any("missing required column" in e.lower() for e in result.document_errors)
    assert len(result.rows) == 100


def test_applies_default_fc_name_to_every_row(real_sample_path):
    result = parse_financial_file(real_sample_path, default_fc_name="Mumbai FC")
    assert {r.fc_name for r in result.rows} == {"Mumbai FC"}
    assert result.fc_identifier_present is True


def test_without_default_fc_name_is_rejected_with_actionable_error(real_sample_path):
    result = parse_financial_file(real_sample_path)
    assert not result.rows
    assert result.fc_identifier_present is False
    assert any("fc identifier" in e.lower() for e in result.document_errors)


def test_synthesizes_dates_from_bare_day_index_and_discloses_it(real_sample_path):
    result = parse_financial_file(real_sample_path, default_fc_name="Mumbai FC")
    days = sorted(r.day for r in result.rows)
    assert days[0].isoformat() == "2024-01-01"
    assert days[-1].isoformat() == "2024-04-09"
    assert any("sequential day numbers" in note for note in result.document_errors)


def test_first_row_values_match_source_workbook_exactly(real_sample_path):
    result = parse_financial_file(real_sample_path, default_fc_name="Mumbai FC")
    first = min(result.rows, key=lambda r: r.day)
    assert first.revenue == 112453
    assert first.manpower_cost == 34221
    assert first.packaging_cost == 8769
    assert first.power_and_fuel == 14467
    assert first.fc_rent == 16846
    assert first.equipment_rentals == 5034
    assert first.overheads == 13134
