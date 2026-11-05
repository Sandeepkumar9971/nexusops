from __future__ import annotations

from rapidfuzz import fuzz

from app.modules.employee_compliance.normalizers.name_normalizer import normalize_name
from app.modules.employee_compliance.verification.config import (
    NAME_AUTO_MATCH_THRESHOLD,
    NAME_MISMATCH_THRESHOLD,
)


def compute_name_similarity(name_a: str | None, name_b: str | None) -> float:
    """0-100 similarity score. Uses token_sort_ratio specifically because it
    tokenizes both names and sorts the tokens before comparing — so
    "Kumar Ravi" and "Ravi Kumar" score 100, not a mismatch, which a plain
    character-sequence ratio would get wrong."""
    norm_a, norm_b = normalize_name(name_a), normalize_name(name_b)
    if not norm_a or not norm_b:
        return 0.0
    return float(fuzz.token_sort_ratio(norm_a, norm_b))


def classify_name_similarity(score: float) -> str:
    """Returns 'MATCH', 'REVIEW', or 'MISMATCH' per the three-band
    threshold scheme documented in verification/config.py."""
    if score >= NAME_AUTO_MATCH_THRESHOLD:
        return "MATCH"
    if score >= NAME_MISMATCH_THRESHOLD:
        return "REVIEW"
    return "MISMATCH"