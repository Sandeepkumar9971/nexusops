from app.modules.employee_compliance.matching.name_matcher import classify_name_similarity, compute_name_similarity
from app.modules.employee_compliance.normalizers.name_normalizer import normalize_name


def test_identical_names_score_100():
    assert compute_name_similarity("Ravi Kumar", "Ravi Kumar") == 100.0


def test_case_and_whitespace_differences_still_match():
    score = compute_name_similarity("RAVI   KUMAR", "ravi kumar")
    assert classify_name_similarity(score) == "MATCH"


def test_word_order_does_not_break_a_match():
    score = compute_name_similarity("Kumar Ravi", "Ravi Kumar")
    assert classify_name_similarity(score) == "MATCH"


def test_punctuation_is_normalized_away():
    assert normalize_name("Ravi. Kumar,") == normalize_name("Ravi Kumar")


def test_minor_spelling_variation_lands_in_review_not_matched():
    """'Mohd' vs 'Mohammed' is a real-world abbreviation difference — the
    system should flag it for a human rather than silently accept it as
    MATCHED, since it isn't a guaranteed match."""
    score = compute_name_similarity("Mohd Irfan Khan", "Mohammed Irfan Khan")
    assert classify_name_similarity(score) == "REVIEW"


def test_genuinely_different_names_are_a_mismatch():
    score = compute_name_similarity("Anita Sharma", "Ramesh Gupta")
    assert classify_name_similarity(score) == "MISMATCH"


def test_truncated_name_lands_in_review():
    score = compute_name_similarity("Ramesh Chandra", "Ramesh C")
    assert classify_name_similarity(score) == "REVIEW"


def test_empty_name_never_scores_as_a_match():
    assert compute_name_similarity("", "Ravi Kumar") == 0.0
    assert compute_name_similarity(None, "Ravi Kumar") == 0.0
